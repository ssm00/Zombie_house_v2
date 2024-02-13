import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import {GameObject, Transform} from "UnityEngine";
import {ClosetData} from "ZEPETO.Multiplay.Schema";
import {ZepetoPlayers} from "ZEPETO.Character.Controller";
import Client from "../Client";
import Closet from "./Closet";
import {RoomData} from "ZEPETO.Multiplay";

/**
 * 옷장에 들어오고 나가는 과정에서 collider 충돌로 move가 아닌 강제 순간이동이 필요함
 * 강제이동과 관련된 동기화 작업이 필요하므로 server와 통신하여 동기화작업 진행
 * 어떤 closet에 누가 들어갔는지 정보가 있어야 동기화가 가능하므로 closet별 Id와 Player정보가 필요함
 * closetManager를 이용하여 closetId를 이용하여 target closet search진행
 * closetManager : 전체 closet관리, client <-> server 통신담당
 * closet : 개별 closet의 실제 출입 구현, 출입 동기화 구현
 * server <-> client <- closetManager <-> closet
 */
export default class ClosetManager extends ZepetoScriptBehaviour {

    public closetList: Map<number, GameObject> = new Map<number, GameObject>();
    private client: Client;

    private static instance;

    public static getInstance() {
        if (this.instance == null) {
            this.instance = GameObject.FindObjectOfType<ClosetManager>();
        }
        return this.instance
    }

    Start() {
        this.client = Client.getInstance();
        const childCount = this.transform.childCount;
        for (let i = 0; i < childCount; i++) {
            const closet = this.transform.GetChild(i).gameObject;
            const closetTs = closet.GetComponentInChildren<Closet>();
            closetTs.setClosetId(i);
            this.closetList.set(i, closet);
        }
    }

    /**
     * 내가 옷장에 들어간 경우 fetch를 위해서 server에 데이터 보내기
     * client에서 보내는 경우 RoomData형식으로 보내야함
     * 받는것은 shema type으로 받기 가능
     */
    public sendServerMoveIntoCloset(closetId: number) {
        const closetData = new RoomData();
        closetData.Add("closetId", closetId);
        closetData.Add("isUsing", true);
        this.client.sendRoomData("moveIntoCloset", closetData);
    }

    /**
     * 내가 옷장에서 나온 경우 동기화를 위한 server에 데이터 보내기
     */
    public sendServerExitCloset(closetId: number) {
        const closetData = new RoomData();
        closetData.Add("closetId", closetId);
        closetData.Add("isUsing", false);
        this.client.sendRoomData("exitFromCloset", closetData);
    }

    /**
     * 다른사람이 옷장에 들어간 경우 내 화면 동기화 하기
     * @param closetData
     */
    public otherMoveToCloset(closetData: ClosetData) {
        const zepetoPlayer = ZepetoPlayers.instance.GetPlayer(closetData.sessionId);
        const closetObject = this.closetList.get(closetData.id);
        const closetTs = closetObject.GetComponentInChildren<Closet>();
        closetTs.moveOtherIntoCloset(zepetoPlayer);
        closetTs.isUsing = true;
    }

    /**
     * 다른사람이 옷장에서 나온 경우 내화면 동기화 하가 T:M(O)
     */
    public otherExitCloset(closetData: ClosetData) {
        const zepetoPlayer = ZepetoPlayers.instance.GetPlayer(closetData.sessionId);
        const closetObject = this.closetList.get(closetData.id);
        const closetTs = closetObject.GetComponentInChildren<Closet>();
        closetTs.exitOtherFromCloset(zepetoPlayer);
        closetTs.isUsing = false;
    }

};