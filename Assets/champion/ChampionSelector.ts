import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import {RawImage} from "UnityEngine.UI";
import {Category, ItemKeyword, ShopService} from "ZEPETO.Module.Shop";
import {Texture2D, WaitUntil} from "UnityEngine";
import {ZepetoPropertyFlag} from "Zepeto";
import {Item} from "ZEPETO.Module.Content";

export default class ChampionSelector extends ZepetoScriptBehaviour {

    public thumbnailImage: RawImage;

    Start() {
        this.StartCoroutine(this.CoGetMyCategory());
    }

    *CoGetMyCategory() {
        var requestCategory = ShopService.GetMyCategoryAsync();
        yield new WaitUntil(() => requestCategory.keepWaiting == false);

        if (requestCategory.responseData.isSuccess) {
            let categoryInfo = requestCategory.responseData.category;
            console.log(`[Category Info] ${categoryInfo.displayName} - length : ${categoryInfo.categories.Length}`);

            let categories: Category[] = categoryInfo.categories;

            for (const category of categories) {
                console.log(`[Category displayName] ${category.displayName} `);
                //Category Keyword is used as an argument in the ShopService.GetMyContentItemListAsync function
                console.log(`[Category keyword] ${category.keyword} `);
            }
        }
        this.StartCoroutine(this.CoGetMyItem());
    }

    *CoGetMyItem() {
        var requestItemList = ShopService.GetMyContentItemListAsync(ItemKeyword.all, null);

        yield new WaitUntil(() => requestItemList.keepWaiting == false);

        if (requestItemList.responseData.isSuccess) {
            let items: Item[] = requestItemList.responseData.items;

            // The number of items received as a result of GetMyContentItemListAsync().
            console.log(items.length);

            for (let i = 0; i < items.length; ++i) {
                const property: ZepetoPropertyFlag = items[i].property;
                // Item ID and item property
                console.log(`[Content Item] (id): ${items[i].id} | (property): ${property}`);

                // Setting the item thumbnail as the texture of a rawImage
                var textureReq = items[i].GetThumbnailAsync();
                yield new WaitUntil(() => textureReq.keepWaiting == false);
                let thumbnailTexture: Texture2D = textureReq.responseData.texture;
                this.thumbnailImage.texture = thumbnailTexture;

            }
        }
    }

}