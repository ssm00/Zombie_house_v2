import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import {ProductRecord, ProductService} from 'ZEPETO.Product'
import {Button, Image, Text} from "UnityEngine.UI";

export default class ITM_ShopProduct extends ZepetoScriptBehaviour {
    public productRecord:ProductRecord;

    //아이템 사진 밑에 넣을 글씨
    @SerializeField() private itemInfo :Text
    @SerializeField() private priceTxt : Text;
    @SerializeField() private purchaseBtn : Button;
    
    public RefreshCurrencyPackage(product : ProductRecord){
        this.productRecord = product;
        
        if(this.productRecord!= null) {
            //패키지의 경우 구입하면 주는 코인의 갯수가 설명 칸에 들어감
            this.itemInfo.text =this.productRecord.currencyPackageUnits[0]?.quantity.toString();
            this.priceTxt.text = this.productRecord.price.toString();
            // remove past cache listeners
            this.purchaseBtn.onClick.RemoveAllListeners();
            // purchaseBtn addlistner
            this.purchaseBtn.onClick.AddListener(()=>{
                // official UI popup open
                ProductService.OpenPurchaseUI(product);
            });
        }
    }
    
    //확인필요
    public RefreshCharacter(product : ProductRecord){
        this.productRecord = product;
        if(this.productRecord!= null) {
            //캐릭터는 이름 넣기
            this.itemInfo.text = this.productRecord.name;
            this.priceTxt.text = this.productRecord.price.toString();

            // remove past cache listeners
            this.purchaseBtn.onClick.RemoveAllListeners();
            // purchaseBtn addlistner
            this.purchaseBtn.onClick.AddListener(()=>{
                // official UI popup open
                ProductService.OpenPurchaseUI(product);
            });
        }
    }

    public RefreshItem(product : ProductRecord){
        this.productRecord = product;
        if(this.productRecord!= null) {
            //아이템 이름 넣기
            this.itemInfo.text = this.productRecord.name;
            this.priceTxt.text = this.productRecord.price.toString();

            // remove past cache listeners
            this.purchaseBtn.onClick.RemoveAllListeners();
            // purchaseBtn addlistner
            this.purchaseBtn.onClick.AddListener(()=>{
                // official UI popup open
                ProductService.OpenPurchaseUI(product);
            });
        }
    }

}