import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import {AudioSource, Transform, Vector3} from "UnityEngine";
import {Player} from "ZEPETO.Multiplay.Schema";

export default class WalkSoundPlay extends ZepetoScriptBehaviour {

    private walkSound: AudioSource;

    Start() {
        this.walkSound = this.GetComponent<AudioSource>()
    }

    public on() {
        this.walkSound.enabled = true
    }

    public off() {
        this.walkSound.enabled = false
    }
}