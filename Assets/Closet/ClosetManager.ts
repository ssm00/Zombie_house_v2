import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import {GameObject, Transform} from "UnityEngine";
import {ClosetData} from "ZEPETO.Multiplay.Schema";
import {ZepetoPlayers} from "ZEPETO.Character.Controller";

export default class ClosetManager extends ZepetoScriptBehaviour {

    public closetList: Map<number, GameObject> = new Map<number, GameObject>();

    private static instance;

    public static getInstance() {
        if (this.instance == null) {
            this.instance = GameObject.FindObjectOfType<ClosetManager>();
        }
        return this.instance
    }

    Start() {
        const childCount = this.transform.childCount;
        console.log(childCount);
        for (let i = 0; i < childCount; i++) {
            const closet = this.transform.GetChild(i).gameObject;
            console.log(closet)
            this.closetList.set(i, closet);
        }
    }

    public moveOtherToCloset(closetData: ClosetData) {
        console.log(`${typeof closetData.sessionId} 타입`);
        const zepetoPlayer = ZepetoPlayers.instance.GetPlayer(closetData.sessionId);
    }

    public meIntoCloset(closetData: ClosetData) {

    }

}