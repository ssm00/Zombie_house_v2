import {ZepetoScriptBehaviour} from 'ZEPETO.Script'
import {Button, Image} from "UnityEngine.UI";
import {
    Animator,
    AudioClip,
    AudioSource,
    CapsuleCollider,
    GameObject,
    Object, Sprite, Time,
    Vector3, WaitForEndOfFrame,
    WaitForSeconds
} from "UnityEngine";
import Client from "../Client";
import {ZepetoPlayer, ZepetoPlayers} from "ZEPETO.Character.Controller";
import {ZepetoWorldMultiplay} from "ZEPETO.World";
import {Room} from "ZEPETO.Multiplay";
import {Player} from "ZEPETO.Multiplay.Schema";

export default class ChampionManager extends ZepetoScriptBehaviour {

    public skillButton: Button;
    public attackButton: Button;
    public attackCoolTimeImg: Image;
    public skillCoolTimeImg: Image;
    public attackSound: AudioClip;

    public moveSpeedupImg: Sprite;
    public attackSpeedupImg: Sprite;
    public lungeImg: Sprite;

    private attackCoolTime: number;
    private skillCoolTime: number;
    private additionalSpeed: number;

    private client: Client;
    private championName: string;
    private zombieHand: CapsuleCollider;
    private myPlayerAnimator: Animator;
    private multiplay : ZepetoWorldMultiplay;
    private room : Room;
    private myPlayer: ZepetoPlayer;

    private static instance;

    public static getInstance() {
        if (this.instance == null) {
            this.instance = GameObject.FindObjectOfType<ChampionManager>();
        }
        return this.instance
    }

    Start() {
        this.client = Client.getInstance();
        this.multiplay = Object.FindObjectOfType<ZepetoWorldMultiplay>();
        this.multiplay.RoomJoined += (room: Room) => {
            this.room = room;
        }
        this.attackButton.onClick.AddListener(this.doAttack.bind(this));
    }

    public selectChampion(name: string, player: ZepetoPlayer, zombieHand: CapsuleCollider, myPlayerAnimator: Animator) {
        this.championName = name;
        this.zombieHand = zombieHand;
        this.myPlayerAnimator = myPlayerAnimator;
        this.myPlayer = player;
        this.skillOn(name);
        this.attackOn();
    }

    //추가 이동속도
    public getAdditionalSpeed(name: string) {
        if (name == "cha_normal") {
            return 0.2;
        } else if (name == "cha_movespeedup") {
            return 0;
        } else if (name == "cha_lunge") {
            return 0.1;
        } else if (name == "cha_attackspeedup") {
            return 0.1;
        }
    }

    /**
     * 옵션은 상품 ID와 동일하게 설정해야함 이후 새로운 캐릭터 추가 시 참고
     * 1. cha_normal 기본
     * 2. cha_movespeedup 스킬 사용시 이동속도 부스트
     * 3. cha_lunge 스킬 사용시 돌진
     * 4. cha_attackspeedup 스킬 사용시 공격속도 업
     */
    private skillOn(name: string) {
        if (name == "cha_normal") {
            this.normalSetting()
            this.skillButton.gameObject.SetActive(false);
        }else if (name == "cha_movespeedup") {
            this.moveSpeedSetting();
            this.skillButton.gameObject.SetActive(true);
            this.skillButton.image.sprite = this.moveSpeedupImg;
            this.skillCoolTimeImg.sprite = this.moveSpeedupImg;
            this.skillButton.onClick.AddListener(this.moveSpeedSkill.bind(this));
        } else if (name == "cha_lunge") {
            this.lungeSetting();
            this.skillButton.gameObject.SetActive(true);
            this.skillButton.image.sprite = this.lungeImg;
            this.skillCoolTimeImg.sprite = this.lungeImg;
            this.skillButton.onClick.AddListener(this.lungeSkill.bind(this));
        } else if (name == "cha_attackspeedup") {
            this.attackSpeedUpSetting();
            this.skillButton.gameObject.SetActive(true);
            this.skillButton.image.sprite = this.attackSpeedupImg;
            this.skillCoolTimeImg.sprite = this.attackSpeedupImg;
            this.skillButton.onClick.AddListener(this.attackSpeedUpSkill.bind(this));
        }
    }

    private attackOn() {
        this.attackButton.gameObject.SetActive(true);
    }

    private normalSetting() {
        this.additionalSpeed = 0.2
        this.attackCoolTime = 2
    }

    private lungeSetting() {
        this.additionalSpeed = 0
        this.attackCoolTime = 2
        this.skillCoolTime = 10
    }

    private moveSpeedSetting() {
        this.additionalSpeed = 0.1
        this.attackCoolTime = 2
        this.skillCoolTime = 10
    }

    private attackSpeedUpSetting() {
        this.additionalSpeed = 0.1
        this.attackCoolTime = 2
        this.skillCoolTime = 10
    }

    private lungeSkill() {
        this.room.Send("lungeUsing", "lungeUsing");
        this.StartCoroutine(this.LungeCoRoutine());
        this.StartCoroutine(this.SkillCoolDown());
    }

    * LungeCoRoutine() {
        this.myPlayer.character.additionalRunSpeed += 5
        let forward: Vector3 = this.myPlayer.character.gameObject.transform.forward;
        forward = this.vectorMul(forward, 3);
        let position = this.myPlayer.character.gameObject.transform.position;
        position = this.vectorPlus(position, forward);
        this.myPlayer.character.MoveToPosition(position);
        yield new WaitForSeconds(0.2);
        this.myPlayer.character.additionalRunSpeed -= 5
        this.doAttack();
    }

    public otherLungeSkill(sessionId:string) {
        this.StartCoroutine(this.OtherLungeCoRoutine(sessionId));
    }

    * OtherLungeCoRoutine(sessionId:string) {
        const otherPlayer = ZepetoPlayers.instance.GetPlayer(sessionId);
        otherPlayer.character.additionalRunSpeed += 5
        let forward: Vector3 = otherPlayer.character.gameObject.transform.forward;
        forward = this.vectorMul(forward, 3);
        let position = otherPlayer.character.gameObject.transform.position;
        position = this.vectorPlus(position, forward);
        otherPlayer.character.MoveToPosition(position);
        yield new WaitForSeconds(0.2);
        otherPlayer.character.additionalRunSpeed -= 5
        this.othersAttackMotion(sessionId);
    }

    // 이동속도 스킬
    private moveSpeedSkill() {
        const boostTime = 2;
        this.room.Send("moveSpeedUsing", boostTime);
        this.StartCoroutine(this.MoveSpeedCoRoutine(boostTime));
        this.StartCoroutine(this.SkillCoolDown());
    }

    * MoveSpeedCoRoutine(boostTime: number) {
        this.additionalSpeed += 1;
        yield new WaitForSeconds(boostTime);
        this.additionalSpeed -= 1;
    }

    public otherMoveSpeedSkill(sessionId: string, boostTime: number) {
        this.StartCoroutine(this.OtherMoveSpeedCoRoutine(sessionId, boostTime));
    }

    * OtherMoveSpeedCoRoutine(sessionId:string, boostTime: number) {
        const otherPlayer = ZepetoPlayers.instance.GetPlayer(sessionId);
        otherPlayer.character.additionalRunSpeed += 1;
        yield new WaitForSeconds(boostTime);
        otherPlayer.character.additionalRunSpeed -= 1;
    }
    ////
    
    //공격속도
    private attackSpeedUpSkill() {
        const boostTime = 3;
        this.room.Send("moveSpeedUsing", boostTime);
        this.StartCoroutine(this.AttackSpeedCoRoutine(boostTime));
        this.StartCoroutine(this.SkillCoolDown());
    }

    * AttackSpeedCoRoutine(boostTime: number) {
        this.attackCoolTime -= 1;
        yield new WaitForSeconds(boostTime);
        this.attackCoolTime += 1;
    }

    /**
     * 스킬 사용시 StartCoroutine으로 호출
     * 스킬 쿨타임 시작 메소드
     */
    *SkillCoolDown() {
        let time = 0;
        this.skillButton.enabled = false;
        while(time <= this.skillCoolTime){
            time += Time.deltaTime;
            let percent = time / this.skillCoolTime;
            this.skillCoolTimeImg.fillAmount = percent
            yield null;
        }
        this.skillButton.enabled = true;
        this.skillCoolTimeImg.fillAmount = 0;
    }

    //모션은 동기로 실행
    private attackMotion() {
        this.myPlayerAnimator.SetTrigger("Attack");
        this.myPlayerAnimator.CrossFade("Attack", 1, 1, 0.1);
        AudioSource.PlayClipAtPoint(this.attackSound, this.myPlayer.character.transform.position);
        this.room.Send("attackMotion", "attack motion");
    }

    //손 col 키기는 코루틴 모션 속도랑 맞춰서 켜야함
    *AttackCoRoutine() {
        //버튼 비활성화, 게이지 돌리기
        this.zombieHand.enabled = true;
        this.attackMotion();
        yield new WaitForSeconds(0.8);
        this.zombieHand.enabled = false;
    }

    *AttackCoolDown() {
        let time = 0;
        this.attackButton.enabled = false;
        while(time <= this.attackCoolTime){
            time += Time.deltaTime;
            let percent = time / this.attackCoolTime;
            this.attackCoolTimeImg.fillAmount = percent
            yield null;
        }
        this.attackButton.enabled = true;
        this.attackCoolTimeImg.fillAmount = 0;
    }

    public othersAttackMotion(sessionId:string) {
        const zepetoPlayer = ZepetoPlayers.instance.GetPlayer(sessionId);
        const othersAnimator = zepetoPlayer.character.GetComponentInChildren<Animator>();
        AudioSource.PlayClipAtPoint(this.attackSound, zepetoPlayer.character.transform.position);
        othersAnimator.SetTrigger("Attack");
        othersAnimator.CrossFade("Attack", 1, 1, 0.1);
    }


    private doAttack() {
        this.StartCoroutine(this.AttackCoRoutine());
        this.StartCoroutine(this.AttackCoolDown());
    }

    private vectorMul(vector3:Vector3, num:number) {
        vector3.x = vector3.x * num;
        vector3.y = vector3.y * num;
        vector3.z = vector3.z * num;
        return vector3
    }

    private vectorPlus(vector1:Vector3, vector2:Vector3) {
        vector1.x = vector1.x + vector2.x;
        vector1.y = vector1.y + vector2.y;
        vector1.z = vector1.z + vector2.z;
        return vector1
    }
};

export interface MoveSpeedSkillData {
    sessionId: string,
    boostTime: number;
}