import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import {Image} from "UnityEngine.UI";
import {GameObject, Sprite} from "UnityEngine";

export default class BoxColorManager extends ZepetoScriptBehaviour {

    public boxUiList: GameObject[];
    public boxGreen: Sprite;

    public static instance;

    public static getInstance() {
        if (this.instance == null) {
            this.instance = GameObject.FindObjectOfType<BoxColorManager>();
        }
        return this.instance
    }

    Start() {
        const box1 = this.transform.Find("box1").gameObject;
        const box2 = this.transform.Find("box2").gameObject;
        const box3 = this.transform.Find("box3").gameObject;
        this.boxUiList.push(box1,box2,box3);
    }

    public updateColor(openBoxCount:number) {
        for (let i = 0; i < openBoxCount; i++) {
            this.boxUiList[i].GetComponent<Image>().sprite = this.boxGreen;
        }
    }
}