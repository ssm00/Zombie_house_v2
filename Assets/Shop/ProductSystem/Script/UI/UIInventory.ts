import {ZepetoScriptBehaviour} from 'ZEPETO.Script'
import {Button, Text, ToggleGroup} from 'UnityEngine.UI'
import {GameObject, Object, Sprite, Transform, WaitUntil} from 'UnityEngine'
import {InventoryRecord, InventoryService} from "ZEPETO.Inventory";
import {CurrencyService} from "ZEPETO.Currency";
import {ProductRecord, ProductService, PurchaseType} from "ZEPETO.Product";
import {ZepetoWorldMultiplay} from "ZEPETO.World";
import {Room, RoomData} from "ZEPETO.Multiplay";
import ITM_Inventory from './ITM_Inventory';
import {BalanceSync, InventorySync, Currency} from "./UIBalances";

export default class UIInventory extends ZepetoScriptBehaviour {
    @SerializeField() private usedSlotNumTxt : Text;
    @SerializeField() private possessionStarTxt : Text;
    @SerializeField() private useBtn : Button;
    
    @SerializeField() private contentParent : Transform;
    @SerializeField() private prefItem : GameObject;
    @SerializeField() private itemImage : Sprite[];
    
    private _inventoryCache: InventoryRecord[];
    private _productCache: Map<string, ProductRecord> = new Map<string, ProductRecord>();
    private _multiplay : ZepetoWorldMultiplay;
    private _room : Room;

    private Start() {
        this._multiplay = Object.FindObjectOfType<ZepetoWorldMultiplay>();
        this._multiplay.RoomJoined += (room: Room) => {
            this._room = room;
            this.InitMessageHandler();
        }
        
        this.StartCoroutine(this.LoadAllItems());
    }
    
    private InitMessageHandler(){
        ProductService.OnPurchaseCompleted.AddListener((product, response) => {
            this.StartCoroutine(this.RefreshInventoryUI());
            this.StartCoroutine(this.RefreshBalanceUI());
        });
        this._room.AddMessageHandler<InventorySync>("SyncInventories", (message) => {
            this.StartCoroutine(this.RefreshInventoryUI());
        });
        this._room.AddMessageHandler<BalanceSync>("SyncBalances", (message) => {
            this.StartCoroutine(this.RefreshBalanceUI());
        });
        this.useBtn.onClick.AddListener(()=> this.OnClickUseInventoryItem());
    }

    private* LoadAllItems() {
        //존재하는 월드 아이템 가져오기
        const request = ProductService.GetProductsAsync();
        yield new WaitUntil(() => request.keepWaiting == false);
        if (request.responseData.isSuccess) {
            request.responseData.products.forEach((pr) => {
                this._productCache.set(pr.productId,pr);
            });
        }

        this.StartCoroutine(this.RefreshInventoryUI());
        this.StartCoroutine(this.RefreshBalanceUI());
    }

    //인벤토리 UI 업데이트하기
    private * RefreshInventoryUI(){
        //플레이어의 인벤토리 조회 
        const request = InventoryService.GetListAsync();
        yield new WaitUntil(()=>request.keepWaiting == false);
        if(request.responseData.isSuccess) {
            const items: InventoryRecord[] = request.responseData.products;
            //items는 내 아이템
            items.forEach((ir, index) => {
                // 사용아이템인데 갯수 0개인 경우
                if (ir.quantity <= 0 && this._productCache.get(ir.productId).PurchaseType == PurchaseType.Consumable) {
                    // remove inventory
                    const data = new RoomData();
                    data.Add("productId", ir.productId);
                    this._multiplay.Room?.Send("onRemoveInventory", data.GetObject());
                    return;
                }

            });

            // If the value matches the previously received value, do not update it.
            if (this._inventoryCache === items) 
                return;
            // 아이템 갯수만 바뀐경우
            else if (items != null && this._inventoryCache?.length == items.length) 
                this.UpdateInventory(items);
            //그냥 맨처음 인벤토리 구성하기
            else
                this.CreateInventory(items);

            this.usedSlotNumTxt.text = items.length.toString();
            this._inventoryCache = items;
        }
    }
    
    //수량변경시
    private UpdateInventory(items:InventoryRecord[]){
        //컴포넌트의 item 스크립트 리스트
        const itemScripts = this.contentParent.GetComponentsInChildren<ITM_Inventory>();
        items.forEach((ir)=>{
            itemScripts.forEach((itemScript)=>{
                if(itemScript.itemRecord.productId == ir.productId) {            
                    const isShowQuantity:boolean = this._productCache.get(ir.productId).PurchaseType == PurchaseType.Consumable;
                    itemScript.RefreshItem(ir, isShowQuantity);
                    return;
                }
            });
        });
    }

    /**
     * 맨처음 실행 인벤토리 구성하기
     * @param items 내가 가지고 있는 items
     */
    private CreateInventory(items :InventoryRecord[]){
        //더미 제거
        this.contentParent.GetComponentsInChildren<ITM_Inventory>().forEach((child)=>{
            GameObject.Destroy(child.gameObject);
        });

        // Sort by Create Order (descending order)
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        items.forEach((ir, index) => {
            const itemObj = Object.Instantiate(this.prefItem, this.contentParent) as GameObject;

            const itemScript = itemObj.GetComponent<ITM_Inventory>();
            this.itemImage.forEach((s, index) => {
                // Import by name comparison from image resources.
                // 아이템아이디로 이미지 로딩
                if (s.name == ir.productId) {
                    itemScript.itemImage.sprite = this.itemImage[index];
                    return;
                }
            });
            // Non-consumable items do not display numbers.
            // 아이템 수량 설정하기
            const isShowQuantity:boolean = this._productCache.get(ir.productId).PurchaseType == PurchaseType.Consumable;
            itemScript.RefreshItem(ir, isShowQuantity);
            itemScript.isOn(index == 0);
        });
    }

    //인벤토리 내 coin
    private *RefreshBalanceUI(){
        const request = CurrencyService.GetUserCurrencyBalancesAsync();
        yield new WaitUntil(()=>request.keepWaiting == false);
        if(request.responseData.isSuccess) {
            this.possessionStarTxt.text = request.responseData.currencies.ContainsKey(Currency.coin) ? request.responseData.currencies.get_Item(Currency.coin).toString() : "0";
        }
        else{
            console.log(request.responseData.ErrorCode);
        }
    }
    
    //사용 아이템 사용
    private OnClickUseInventoryItem(){
        const toggleGroup = this.contentParent.GetComponent<ToggleGroup>();
        const item = toggleGroup.GetFirstActiveToggle()?.GetComponent<ITM_Inventory>().itemRecord;
        
        if(item == null){
            console.warn("no have item data");
            return;
        }
        if(this._multiplay.Room == null){
            console.warn("server disconnect");
            return;
        }
        const data = new RoomData();
        data.Add("productId", item.productId);
        data.Add("quantity", 1);
        this._multiplay.Room?.Send("onUseInventory", data.GetObject());
    }

}
