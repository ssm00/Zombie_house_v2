import {ZepetoScriptBehaviour} from 'ZEPETO.Script'
import {Button, Text} from 'UnityEngine.UI'
import {WaitUntil, GameObject} from 'UnityEngine'
import {CurrencyService} from "ZEPETO.Currency";
import {CurrencyPackageUnitRecord, ProductRecord, ProductService, ProductType} from "ZEPETO.Product";
import ITM_ShopProduct from './ITM_ShopProduct'
import {Currency} from "./UIBalances";

export default class UIShop extends ZepetoScriptBehaviour {

    @SerializeField() private characterButton: Button;
    @SerializeField() private itemButton: Button;
    @SerializeField() private coinButton: Button;
    @SerializeField() private characterContainer: GameObject;
    @SerializeField() private itemContainer: GameObject;
    @SerializeField() private coinContainer: GameObject;
    @SerializeField() private possessionCoinTxt: Text;
    @SerializeField() private possessionZemTxt: Text;
    @SerializeField() private coinProducts: GameObject[];
    @SerializeField() private characterProducts: GameObject[];
    @SerializeField() private itemProducts: GameObject[];

    private _products: ProductRecord[];

    Start() {
        this.StartCoroutine(this.RefreshZemUI());
        this.StartCoroutine(this.RefreshProducts());
        this.StartCoroutine(this.RefreshBalanceUI());
        this.characterButton.onClick.AddListener(() => {
            this.characterContainer.SetActive(true);
            this.itemContainer.SetActive(false);
            this.coinContainer.SetActive(false);
        });

        this.itemButton.onClick.AddListener(() => {
            this.characterContainer.SetActive(false);
            this.itemContainer.SetActive(true);
            this.coinContainer.SetActive(false);
        });

        this.coinButton.onClick.AddListener(() => {
            this.characterContainer.SetActive(false);
            this.itemContainer.SetActive(false);
            this.coinContainer.SetActive(true);
        });

        ProductService.OnPurchaseCompleted.AddListener((productRecord, response) => {
            this.StartCoroutine(this.RefreshZemUI());
            this.StartCoroutine(this.RefreshBalanceUI());
        });
    }

    private *RefreshBalanceUI(){
        const request = CurrencyService.GetUserCurrencyBalancesAsync();
        yield new WaitUntil(()=>request.keepWaiting == false);
        if(request.responseData.isSuccess) {
            this.possessionCoinTxt.text = request.responseData.currencies?.ContainsKey(Currency.coin) ? request.responseData.currencies?.get_Item(Currency.coin).toString() :"0";
        }
    }

    private* RefreshZemUI() {
        const request = CurrencyService.GetOfficialCurrencyBalanceAsync();

        yield new WaitUntil(() => request.keepWaiting == false);
        if (request.responseData.isSuccess) {
            this.possessionZemTxt.text = request.responseData.currency.quantity.toString();
        }
    }

    private* RefreshProducts() {
        //전체 상품 가져오기
        const request = ProductService.GetProductsAsync();
        yield new WaitUntil(() => request.keepWaiting == false);

        if (!request.responseData || !request.responseData.isSuccess) {
            console.warn("Refresh Products Failed");
            console.warn("See the Product docs <color=blue><a>https://naverz-group.readme.io/studio-world/docs/zepeto_product</a></color> for more information.");
            return;
        }

        //통화 패키지만
        let characterIndex = 0;
        let coinIndex = 0;
        let itemIndex = 0;
        for (const product of request.responseData.products || []) {
            if (product.ProductType === ProductType.CurrencyPackage && coinIndex < this.coinProducts.length) {
                this.coinProducts[coinIndex].GetComponent<ITM_ShopProduct>().RefreshCurrencyPackage(product);
                coinIndex++;
            } else if(product.ProductType === ProductType.Item && characterIndex < this.characterProducts.length && product.productId.startsWith("cha_")) {
                this.characterProducts[characterIndex].GetComponent<ITM_ShopProduct>().RefreshCharacter(product);
                characterIndex++;
            }else if(product.ProductType === ProductType.Item && itemIndex < this.itemProducts.length) {
                this.itemProducts[itemIndex].GetComponent<ITM_ShopProduct>().RefreshItem(product);
                itemIndex++;
            }

        }
    }

};
