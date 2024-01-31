import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import {Collision, GameObject} from "UnityEngine";
import CatchId from "./CatchId";
import Client from "./Client";

export default class CatchManager extends ZepetoScriptBehaviour {

    private sessionId;

    private client:Client

    Start() {
        this.client = GameObject.FindObjectOfType<Client>();
    }

    /**
     * tag는3가지
     * Me -> 나
     * Player -> 나머지 사람
     * Zombie -> 나머지 좀비
     */
    private OnTriggerEnter(col:Collision) {
        console.log(`ontrigger ${col}`)
        if (col.gameObject.tag == "Player") {
            const sessionId: string = col.gameObject.GetComponent<CatchId>().getSessionId();
            this.client.attackLogic(sessionId);
        }
    }

    private getSessionId() {
        return this.sessionId;
    }
}