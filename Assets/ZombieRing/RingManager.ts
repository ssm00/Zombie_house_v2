import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import {GameObject, Object} from "UnityEngine";
import {ZepetoPlayer} from "ZEPETO.Character.Controller";
import * as UnityEngine from "UnityEngine";

export default class RingManager extends ZepetoScriptBehaviour {

    public ringRed: GameObject;
    public ringOrange: GameObject;
    public ringYellow: GameObject;
    public ringGreen: GameObject;
    public ringBlue: GameObject;
    public ringPurple: GameObject;

    private static instance;
    public static getInstance() {
        if (this.instance == null) {
            this.instance = GameObject.FindObjectOfType<RingManager>();
        }
        return this.instance
    }

    public makeRing(ringColor:string, zepetoPlayer:ZepetoPlayer) {
        let selectRing = this.ringRed
        if (ringColor == "ring_orange") {
            selectRing = this.ringOrange;
        }else if (ringColor == "ring_yellow") {
            selectRing = this.ringYellow;
        }else if (ringColor == "ring_green") {
            selectRing = this.ringGreen;
        }else if (ringColor == "ring_blue") {
            selectRing = this.ringBlue;
        }else if (ringColor == "ring_purple") {
            selectRing = this.ringPurple;
        }
        const zombieRing = Object.Instantiate(selectRing) as GameObject;
        zombieRing.transform.parent = zepetoPlayer.character.transform;
        zombieRing.transform.localPosition = UnityEngine.Vector3.zero;
    }

}