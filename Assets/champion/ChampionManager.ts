import {ZepetoScriptBehaviour} from 'ZEPETO.Script'
import {Button, Image} from "UnityEngine.UI";
import {
    Animator,
    AudioClip,
    AudioSource,
    CapsuleCollider,
    GameObject,
    Object, Time,
    Vector3, WaitForEndOfFrame,
    WaitForSeconds
} from "UnityEngine";
import Client from "../Client";
import {ZepetoPlayer, ZepetoPlayers} from "ZEPETO.Character.Controller";
import {ZepetoWorldMultiplay} from "ZEPETO.World";
import {Room} from "ZEPETO.Multiplay";

export default class ChampionManager extends ZepetoScriptBehaviour {

    public skillButton: Button;
    public attackButton: Button;
    public attackCoolTimeImg: Image;
    public skillCoolTimeImg: Image;
    public attackSound: AudioClip;

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
        if (name == "Normal") {
            return 0.2;
        } else if (name == "MoveSpeedUp") {
            return 0;
        } else if (name == "Lunge") {
            return 0.1;
        } else if (name == "AttackSpeedUp") {
            return 0.1;
        }
    }

    /**
     * 1. normal 기본
     * 2. movespeedup 스킬 사용시 이동속도 부스트
     * 3. lunge 스킬 사용시 돌진
     * 4. attackSpeedUp 스킬 사용시 공격속도 업
     */
    private skillOn(name: string) {
        if (name == "Normal") {
            this.normalSetting()
            this.skillButton.gameObject.SetActive(false);
        }else if (name == "MoveSpeedUp") {
            this.moveSpeedSetting();
            this.skillButton.gameObject.SetActive(true);
            this.skillButton.onClick.AddListener(this.moveSpeedSkill.bind(this));
        } else if (name == "Lunge") {
            this.lungeSetting();
            this.skillButton.gameObject.SetActive(true);
            this.skillButton.onClick.AddListener(this.lungeSkill.bind(this));
        } else if (name == "AttackSpeedUp") {
            this.attackSpeedUpSetting();
            this.skillButton.gameObject.SetActive(true);
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
        this.additionalSpeed = 0
        this.attackCoolTime = 2
        this.skillCoolTime = 10
    }

    private attackSpeedUpSetting() {
        this.additionalSpeed = 0
        this.attackCoolTime = 2
        this.skillCoolTime = 10
    }

    private lungeSkill() {
        this.room.Send("lungeUsing", "lungeUsing");
        this.StartCoroutine(this.LungeCoRoutine(this.myPlayer));
        this.StartCoroutine(this.SkillCoolDown());
        this.doAttack();
    }

    // * LungeCoRoutine() {
    //     this.myPlayer.character.additionalRunSpeed += 5
    //     let forward: Vector3 = this.myPlayer.character.gameObject.transform.forward;
    //     forward = this.vectorMul(forward, 3);
    //     let position = this.myPlayer.character.gameObject.transform.position;
    //     position = this.vectorPlus(position, forward);
    //     this.myPlayer.character.MoveToPosition(position);
    //     yield new WaitForSeconds(1);
    //     this.myPlayer.character.additionalRunSpeed -= 5
    // }

    * LungeCoRoutine(zepetoPlayer:ZepetoPlayer) {
        zepetoPlayer.character.additionalRunSpeed += 5
        let forward: Vector3 = zepetoPlayer.character.gameObject.transform.forward;
        forward = this.vectorMul(forward, 3);
        let position = zepetoPlayer.character.gameObject.transform.position;
        position = this.vectorPlus(position, forward);
        zepetoPlayer.character.MoveToPosition(position);
        yield new WaitForSeconds(1);
        zepetoPlayer.character.additionalRunSpeed -= 5
    }

    public otherLunge(sessionId:string) {
        const otherPlayer = ZepetoPlayers.instance.GetPlayer(sessionId);
        this.StartCoroutine(this.LungeCoRoutine());
    }

    private moveSpeedSkill() {
        this.StartCoroutine(this.MoveSpeedCoRoutine(3));
        this.StartCoroutine(this.SkillCoolDown());
    }

    * MoveSpeedCoRoutine(boostTime: number) {
        this.additionalSpeed += 1;
        yield new WaitForSeconds(boostTime);
        this.additionalSpeed -= 1;
    }

    private attackSpeedUpSkill() {
        this.StartCoroutine(this.AttackSpeedCoRoutine(3));
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


    private doAttack() {
        if(this.myPlayerAnimator.GetBool("isZombie") == true){
            this.StartCoroutine(this.AttackCoRoutine());
            this.StartCoroutine(this.AttackCoolDown());
        }
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