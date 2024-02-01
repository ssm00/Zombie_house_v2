import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import {AudioClip, AudioSource, GameObject, Time, Transform, Vector3} from "UnityEngine";
import {ZepetoPlayer} from "ZEPETO.Character.Controller";
import {Player, State} from "ZEPETO.Multiplay.Schema";
import WalkSoundPlay from "./WalkSoundPlay";

export default class WalkSoundManager extends ZepetoScriptBehaviour {

    private myWalkSound: WalkSoundPlay;
    public otherWalkSoundList: Map<string, WalkSoundPlay>;

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
        const walkSoundPlay = this.otherWalkSoundList.get(player.sessionId);
        if (player.state == 102) {
            console.log(player.state)
        }
    }



}