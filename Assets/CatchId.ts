import { ZepetoScriptBehaviour } from 'ZEPETO.Script'

export default class CatchId extends ZepetoScriptBehaviour {

    public catchSessionId:string;

    public setSessionId(sessionId:string) {
        this.catchSessionId = sessionId
    }

    public getSessionId() {
        return this.catchSessionId;
    }

}