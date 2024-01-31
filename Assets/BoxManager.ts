import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import {GameObject, Object, Quaternion, Vector3} from "UnityEngine";
import {Transform} from "ZEPETO.Multiplay.Schema";
import PercentEx from "./Box/PercentEx";

export default class BoxManager extends ZepetoScriptBehaviour {

    public box: GameObject;
    private boxList: GameObject[] = [];

    //싱글톤
    private static instance;
    public static getInstance() {
        if (this.instance == null) {
            this.instance = GameObject.FindObjectOfType<BoxManager>();
        }
        return this.instance
    }

    public makingBox(boxPositionList: Transform[]) {
        let boxId = 0;
        for (let boxInfo of boxPositionList){
            const boxPrefab = Object.Instantiate(this.box) as GameObject;
            const percentEx = boxPrefab.gameObject.GetComponentInChildren<PercentEx>();
            percentEx.setBoxId(boxId++);
            boxPrefab.gameObject.tag = "ClosedBox"
            boxPrefab.transform.position = new Vector3(boxInfo.position.x, boxInfo.position.y, boxInfo.position.z);
            boxPrefab.transform.rotation = Quaternion.Euler(new Vector3(boxInfo.rotation.x, boxInfo.rotation.y, boxInfo.rotation.z));
            this.boxList.push(boxPrefab)
        }
    }

    public otherOpenBox(boxId:number) {
        const otherOpenBox = this.boxList[boxId];
        if (otherOpenBox.gameObject.tag == "ClosedBox") {
            const boxScript = otherOpenBox.gameObject.GetComponentInChildren<PercentEx>();
            boxScript.forceOpen();
            otherOpenBox.gameObject.tag = "OpenBox"
        }
    }
}