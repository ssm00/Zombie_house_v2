import {ZepetoScriptBehaviour} from 'ZEPETO.Script'
import {AudioSource} from "UnityEngine";

export default class WalkSoundPlay extends ZepetoScriptBehaviour {

    private walkSound: AudioSource;

    Start() {
        this.walkSound = this.GetComponent<AudioSource>()
    }

    public on() {
        if (this.walkSound) {
            this.walkSound.enabled = true;
        }
    }

    public off() {
        if (this.walkSound) {
            this.walkSound.enabled = false
        }
    }
}