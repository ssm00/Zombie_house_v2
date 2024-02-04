import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import {AudioClip, AudioSource, GameObject, HumanBodyBones, Time, Transform, Vector3} from "UnityEngine";
import {ZepetoPlayer} from "ZEPETO.Character.Controller";
import {Player, State} from "ZEPETO.Multiplay.Schema";
import WalkSoundPlay from "./WalkSoundPlay";

export default class WalkSoundManager extends ZepetoScriptBehaviour {

    @SerializeField() private attachTargetPosition : HumanBodyBones;
    @SerializeField() private walkSoundPrefab: GameObject;

    public otherWalkSoundList: Map<string, WalkSoundPlay> = new Map<string, WalkSoundPlay>();
    private myWalkSound: WalkSoundPlay;

    public static instance;
    public static getInstance() {
        if (this.instance == null) {
            this.instance = GameObject.FindObjectOfType<WalkSoundManager>();
        }
        return this.instance
    }

    public setMyWalkSound(myWalkSound:WalkSoundPlay) {
        this.myWalkSound = myWalkSound;
    }

    public playWalkingSound(player:Player) {
        const walkSound = this.otherWalkSoundList.get(player.sessionId);
        if (player.state == 102 && !player.isCrouch) {
            walkSound.on();
        } else {
            walkSound.off();
        }
    }

    public playMyWalkingSound(playerState:number, isCrouch:boolean) {
        if (playerState == 102 && !isCrouch) {
            this.myWalkSound.on();
        } else if (playerState != null) {
            this.myWalkSound.off()
        }
    }


    public getAttachTargetPosition(): HumanBodyBones {
        return this.attachTargetPosition;
    }

    public getWalkSoundPrefab(): GameObject {
        return this.walkSoundPrefab;
    }
}