import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import {GameObject, Resources, Sprite} from "UnityEngine";
import {Image} from "UnityEngine.UI";

export default class UserColorManager extends ZepetoScriptBehaviour {

    public playerUiList: GameObject[];
    public userRed:Sprite;

    public static instance;

    public static getInstance() {
        if (this.instance == null) {
            this.instance = GameObject.FindObjectOfType<UserColorManager>();
        }
        return this.instance
    }

    Start() {
        const p1 = this.transform.Find("p1").gameObject;
        const p2 = this.transform.Find("p2").gameObject;
        const p3 = this.transform.Find("p3").gameObject;
        const p4 = this.transform.Find("p4").gameObject;
        const p5 = this.transform.Find("p5").gameObject;
        this.playerUiList.push(p1,p2,p3,p4,p5);
    }

    public updateColor(zombieCount:number) {
        for (let i = 0; i < zombieCount; i++) {
            this.playerUiList[i].GetComponent<Image>().sprite = this.userRed;
        }
    }

}