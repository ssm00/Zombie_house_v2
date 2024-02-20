import {ZepetoScriptBehaviour} from 'ZEPETO.Script'
import {ZepetoWorldMultiplay} from "ZEPETO.World";
import {Room, RoomData} from "ZEPETO.Multiplay";
import {Player, State, Transform, Vector3} from "ZEPETO.Multiplay.Schema";
import {
    CharacterState,
    SpawnInfo,
    ZepetoPlayers,
    ZepetoPlayer, ZepetoCamera, ZepetoScreenTouchpad,
} from "ZEPETO.Character.Controller";
import * as UnityEngine from "UnityEngine";
import {
    Animator, AudioClip, AudioSource,
    CapsuleCollider,
    GameObject,
    HumanBodyBones, Material,
    Object,
    Quaternion, SkinnedMeshRenderer,
    Time,
    WaitForSeconds,
    Color,
} from "UnityEngine";
import {TextMeshProUGUI} from "TMPro";
import BoxManager from "./BoxManager";
import {Button, Image} from "UnityEngine.UI";
import CatchId from "./CatchId";
import UserColorManager from "./Ui/UserColorManager";
import BoxColorManager from "./Ui/BoxColorManager";
//minimap
import MinimapManager from './MiniMap/minimapManager';

export default class Client extends ZepetoScriptBehaviour {


    public multiPlay : ZepetoWorldMultiplay;

    //ui
    public crouchButton: Button;
    public attackButton: Button;

    public catchZone: GameObject;
    public isCrouch:bool;
    public zombieRing: GameObject;
    public zombieColor: Material;
    public bodyBone:HumanBodyBones;
    public attackSound: AudioClip;

    private boxManager: BoxManager;
    private userColorManager: UserColorManager;
    private boxColorManager: BoxColorManager;
    //result ui
    public resultPanel: GameObject;
    public winText: TextMeshProUGUI;
    public resultPanelButton: Button;
    public rankPanel: GameObject;
    public gameWinText: TextMeshProUGUI;
    public score: TextMeshProUGUI;
    public plusScore: TextMeshProUGUI;
    public deAliveImage: Image;
    public deAliveScore: TextMeshProUGUI;
    public deStartZombieImage: Image;
    public deStartZombieScore: TextMeshProUGUI;
    public deZombieImage: Image;
    public deZombieScore: TextMeshProUGUI;
    public deHumanCatchCountText: TextMeshProUGUI;
    public deHumanCatchCountScore: TextMeshProUGUI;
    public deBoxopenCountText: TextMeshProUGUI;
    public deBoxopenCountScore: TextMeshProUGUI;
    public lobbyButton: Button;
    //minimap
    private minimapManager: MinimapManager;
    //rank
    private rankScore: number=-1;
    private startZombie: boolean=false;
    private catchHumanCount: number=0;
    private openBoxCount: number=0;

    private speedValue: number=0;
    private startTimer : TextMeshProUGUI;
    private room: Room;
    private myPlayer: ZepetoPlayer;
    private myCamera: ZepetoCamera;
    private myPlayerAnimator : Animator
    private zepetoScreenPad: ZepetoScreenTouchpad;
    private zombieHand: CapsuleCollider;
    private currentPlayers: Map<string, Player> = new Map<string, Player>();

    Start() {
        this.startTimer = GameObject.Find("Canvas").GetComponentInChildren<TextMeshProUGUI>();
        this.boxManager = BoxManager.getInstance();
        this.userColorManager = UserColorManager.getInstance();
        this.boxColorManager = BoxColorManager.getInstance();
        // minimap
        this.minimapManager = MinimapManager.getInstance();
        //rank
        this.resultPanel.SetActive(false);
        this.rankPanel.SetActive(false);
        //lobby canvas 가져오기

        this.crouchButton.onClick.AddListener(() => {
            this.doCrouch();
        });
        this.attackButton.onClick.AddListener(() => {
            this.doAttack();
        });

        this.multiPlay.RoomCreated += (room:Room) => {
            this.room = room
        }
        this.resultPanelButton.onClick.AddListener(() => {
            this.resultContinue();
        });
        this.lobbyButton.onClick.AddListener(() => {
            this.goLobby();
        });
        this.multiPlay.RoomJoined += (room: Room) => {
            //서버의 state가 변경되면 호출
            room.OnStateChange += this.OnStateChange;

            //게임시작 타이머 시간 주고 받기
            room.AddMessageHandler("gameStartTime", (time: number) => {
                this.UpdateStartTimer(time)
            });

            room.AddMessageHandler("boxSetting", (boxPositionList: Transform[]) => {
                this.makeBoxesFromSchema(boxPositionList)
            });

            room.AddMessageHandler("attackMotionInvoke", (sessionId: string) => {
                this.othersAttackMotion(sessionId.toString());
            });

            room.AddMessageHandler("userColorUpdate", (zombieCount: number) => {
                this.userColorManager.updateColor(zombieCount);
            });

            room.AddMessageHandler("boxColorUpdate", (openBoxCount: number) => {
                this.boxColorManager.updateColor(openBoxCount);
            });

            room.AddMessageHandler("otherOpenBox", (boxId: number) => {
                this.boxManager.otherOpenBox(boxId);
            });

            room.AddMessageHandler("mainTimer", (time: number) => {
                this.UpdateStartTimer(time);
            });

            room.AddMessageHandler("playerNumber", (playerNum: number) => {
                this.updatePlayerNumber(playerNum);
            });

            room.AddMessageHandler("gameOver", (msg: string) => {
                this.updateWinUi(msg);
            });
            //rank 점수 받아오기
            room.AddMessageHandler("rankScore", (rankScore: number) => {
                console.log("rankScore", rankScore)
                this.updatePlayerRankScore(rankScore);
            });
            //숙주좀비 설정
            room.AddMessageHandler("setStartZombie", (message: boolean) => {
                console.log("setStartZombie", message)
                this.setStartZombie(message);
            });
            //내가 인간을 감염 시켰을 때
            room.AddMessageHandler("infectOther", (message: number) =>{
                this.addCatchHumanCount(message);
            });
        };

        this.StartCoroutine(this.SendMessageLoop(0.05))
        this.Invoke("updateWinUiTest", 5);
    }

    private * SendMessageLoop(tick: number) {
        while (true) {
            yield new UnityEngine.WaitForSeconds(tick);
            if (this.room != null && this.room.IsConnected) {
                const hasPlayer = ZepetoPlayers.instance.HasPlayer(this.room.SessionId);
                if (hasPlayer) {
                    //getplyaer는 룸에서 나를 반환하는 코드
                    const myPlayer = ZepetoPlayers.instance.GetPlayer(this.room.SessionId);
                    if (myPlayer.character.CurrentState != CharacterState.Idle) {
                        this.sendTransform(myPlayer.character.transform)
                    }
                }
            }
        }

    }

    //룸 state 변경시 감지 , T: 받기
    private OnStateChange(state: State, isFirst: boolean) {
        if (isFirst) {
            //제페토 플레이어(생성된 객체)에 이벤트 리스너 등록 : 오브젝트 생성될때(내가 방에들어왔을때) 맨처음 1번만 하면됨 sendState함수 붙이기
            ZepetoPlayers.instance.OnAddedLocalPlayer.AddListener(() => {
                //생성된 내 플레이어 오브젝트
                const myPlayer = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer;
                this.myPlayer = myPlayer
                this.myPlayerAnimator = myPlayer.character.GetComponentInChildren<Animator>();
                this.myPlayer.character.gameObject.tag = "Me"
                this.myCamera = ZepetoPlayers.instance.LocalPlayer.zepetoCamera;
                this.zepetoScreenPad = ZepetoPlayers.instance.gameObject.GetComponentInChildren<ZepetoScreenTouchpad>();
                this.zepetoScreenPad.OnDragEvent.AddListener(deltaVector => {
                    ZepetoPlayers.instance.ZepetoCamera.transform.RotateAround(this.myPlayer.character.transform.position,
                        UnityEngine.Vector3.up, deltaVector.x * Time.deltaTime * 160);
                });
                //동적생성된 캐릭터에 리스너추가
                myPlayer.character.OnChangedState.AddListener((cur) => {
                    this.SendState(cur);
                });
                //미니맵 초기 설정
                this.minimapManager.setting(this.myPlayer, this.myCamera);
            });
            //다른 플레이어의 position 입력받기위해 나말고 존재하는 다른 사람의 오브젝트에 listener 추가
            ZepetoPlayers.instance.OnAddedPlayer.AddListener((sessionId:string) => {
                sessionId = sessionId.toString();
                const isLocal = this.room.SessionId === sessionId;
                //다른플레이어면
                if (!isLocal) {
                    const player: Player = this.currentPlayers.get(sessionId);
                    this.addCatchSessionId(sessionId);
                    player.OnChange += (ChangeValues) => this.OnUpdatePlayer(sessionId, player)
                }
            });
            //rank 점수 요청하기
            this.room.Send("getRankScore", 0);
        }

        // 내시점 변경 나 상태 변경(룸에서 스키마를 변경했을때) T:M(M)
        this.changeMaPlayerFromSchema(state);

        //원래있던사람 빼고 새로 추가된 사람들
        let join = new Map<string, Player>();
        //나가서 지울사람들
        let leave: Map<string, Player> = new Map<string, Player>(this.currentPlayers);

        //state에 있는 player들을 join에 추가, state server 단에서 추가 해줌 (schema에 players map을 정의해뒀는데 shcema의 state는 변경감지가 가능한걸로 보임)
        state.players.ForEach((sessionId: string, player: Player) => {
            if (!this.currentPlayers.has(sessionId)) {
                join.set(sessionId, player)
            }
            //leave는 지울사람들만 남아야함 state변경 감지 해서 있는사람이면 leave맵에서 제거 idea -> 전체 - 지금 있는 사람 = 나간사람임
            leave.delete(sessionId)
        });
        //새로추가된 사람들만 여기서 플레이어 인스턴스 생성, currentPlayers에도 추가
        join.forEach((player: Player, sessionId: string) => this.OnJoinPlayer(sessionId, player));
        //나간사람 캐릭터 지우기
        leave.forEach((player: Player, sessionId: string) => this.OnLeavePlayer(sessionId, player))
    }
    
    //잡은 사람 sessionId를 알아야 상태 변경 가능 -> sessionId를 제페토 플레이어에 스크립트로 등록하기
    private addCatchSessionId(sessionId:string) {
        const zepetoPlayer = ZepetoPlayers.instance.GetPlayer(sessionId);
        zepetoPlayer.character.gameObject.AddComponent<CatchId>();
        const catchId = zepetoPlayer.character.gameObject.GetComponent<CatchId>();
        catchId.setSessionId(sessionId);
    }

    //내시점 나머지 플레이어 변경 스키마 변경되었을때 T:M(O)
    private OnUpdatePlayer(sessionId: string, player: Player) {
        const zepetoPlayer = ZepetoPlayers.instance.GetPlayer(sessionId);
        console.log(`나머지 변경 ${sessionId} , ${player.role}`)
        this.updateOtherMovement(player, zepetoPlayer);
        //좀비감염시
        if (player.role == "Zombie") {
            const animator: Animator = zepetoPlayer.character.GetComponentInChildren<Animator>();
            zepetoPlayer.character.gameObject.tag = "Zombie";
            if (animator.GetBool("isZombie") == false) {
                animator.SetBool("isZombie", true);
                animator.SetTrigger("BeCatched");
                //좀비링
                const zombieRing = Object.Instantiate(this.zombieRing) as GameObject;
                zombieRing.transform.parent = zepetoPlayer.character.transform;
                zombieRing.transform.localPosition = UnityEngine.Vector3.zero;
                //피부색
                const bodyRenderer = zepetoPlayer.character.GetComponentInChildren<SkinnedMeshRenderer>();
                bodyRenderer.material = this.zombieColor;
            }
        } else if (zepetoPlayer.character.gameObject.tag == "Untagged") {
            zepetoPlayer.character.gameObject.tag = "Player";
        }
    }

    //다른 플레이어 위치 및 모션
    private updateOtherMovement(player: Player, zepetoPlayer: ZepetoPlayer) {
        const position = this.ParseVector3(player.transform.position);
        zepetoPlayer.character.MoveToPosition(position);
        //미니맵에 표시
        this.minimapManager.updateOther(player);
        const othersAnimator = zepetoPlayer.character.GetComponentInChildren<Animator>();
        if (player.state == 104) {
            zepetoPlayer.character.Jump()
        }
        othersAnimator.SetBool("isCrouch", player.isCrouch);
        if (player.isCrouch) {
            zepetoPlayer.character.additionalRunSpeed = -this.speedValue;
            zepetoPlayer.character.characterController.height = 0.6;
            zepetoPlayer.character.characterController.center = new UnityEngine.Vector3(0, 0.3, 0);
        } else {
            zepetoPlayer.character.additionalRunSpeed = this.speedValue;
            zepetoPlayer.character.characterController.height = 1.2;
            zepetoPlayer.character.characterController.center = new UnityEngine.Vector3(0, 0.6, 0);
        }

    }

    private othersAttackMotion(sessionId:string) {
        const isLocal = this.room.SessionId === sessionId;
        const player: Player = this.currentPlayers.get(sessionId);
        if (!isLocal && player.role == "Zombie") {
            const zepetoPlayer = ZepetoPlayers.instance.GetPlayer(sessionId);
            const othersAnimator = zepetoPlayer.character.GetComponentInChildren<Animator>();
            AudioSource.PlayClipAtPoint(this.attackSound, zepetoPlayer.character.transform.position);
            othersAnimator.SetTrigger("Attack");
            othersAnimator.CrossFade("Attack", 1, 1, 0.1);
        }
    }

    // 내시점 변경 나 상태 변경(룸에서 스키마를 변경했을때) T:M(M)
    private changeMaPlayerFromSchema(state:State) {
        //좀비감염시
        const mySchema = state.players[this.room.SessionId];
        if (mySchema.role == "Zombie") {
            if (this.myPlayerAnimator.GetBool("isZombie") == false) {
                this.myPlayerAnimator.SetBool("isZombie", true);
                this.myPlayer.character.gameObject.tag = "Zombie"
                console.log(`좀비 설정성공 ${this.room.SessionId} , ${this.myPlayer.character}`);
                //zombieHand catchZone collider 부착
                const hand: UnityEngine.Transform = this.myPlayerAnimator.GetBoneTransform(this.bodyBone);
                const catchZone = Object.Instantiate(this.catchZone, hand) as GameObject;
                this.zombieHand = catchZone.gameObject.GetComponent<CapsuleCollider>();
                this.zombieHand.enabled = false;
                //나 잡혔을때 좀비 변경 모션추가
                this.StartCoroutine(this.InfectCoRoutine());
                //좀비링
                const zombieRing = Object.Instantiate(this.zombieRing) as GameObject;
                zombieRing.transform.parent = this.myPlayer.character.transform;
                zombieRing.transform.localPosition = UnityEngine.Vector3.zero;
                //피부색
                const bodyRenderer = this.myPlayer.character.GetComponentInChildren<SkinnedMeshRenderer>();
                bodyRenderer.material = this.zombieColor;
                //속도
                this.speedValue = 0.2;
                this.myPlayer.character.additionalRunSpeed += 0.2;
            }
        }
    }

    //내시점 박스 위치 설정 T:M(M)
    private makeBoxesFromSchema(boxPositionList: Transform[]) {
        this.boxManager.makingBox(boxPositionList)
    }

    //내가 박스를 연 경우
    public openBox(boxId:number) {
        this.openBoxCount += 1;
        this.room.Send("boxOpen",boxId)
    }
    
    
    //나 숙이기 T:M(M)
    private doCrouch() {
        this.isCrouch = !this.isCrouch;
        this.myPlayerAnimator.SetBool("isCrouch", !this.myPlayerAnimator.GetBool("isCrouch"));
        this.room.Send("crouch", this.isCrouch);
        if(this.isCrouch) {
            this.myPlayer.character.additionalRunSpeed = -1;
            this.myPlayer.character.characterController.height = 0.5;
            this.myPlayer.character.characterController.center = new UnityEngine.Vector3(0, 0.2, 0);
        }else {
            this.myPlayer.character.additionalRunSpeed = this.speedValue;
            this.myPlayer.character.characterController.height = 1.2;
            this.myPlayer.character.characterController.center = new UnityEngine.Vector3(0, 0.6, 0);
        }
    }

    //나 공격 T:M(M)
    private doAttack() {
        if(this.myPlayerAnimator.GetBool("isZombie") == true){
            this.StartCoroutine(this.AttackCoRoutine());
        }
    }
    
    //손 col 키기는 코루틴 모션 속도랑 맞춰서 켜야함
    *AttackCoRoutine() {
        this.zombieHand.enabled = true;
        this.attackMotion();
        yield new WaitForSeconds(0.8);
        this.zombieHand.enabled = false;
    }
    
    //모션은 동기로 실행
    private attackMotion() {
        this.myPlayerAnimator.SetTrigger("Attack");
        this.myPlayerAnimator.CrossFade("Attack", 1, 1, 0.1);
        AudioSource.PlayClipAtPoint(this.attackSound, this.myPlayer.character.transform.position);
        this.room.Send("attackMotion", "attack motion");
    }


    //공격은 나만 구현하면 됨 CatchManager 에서 호출
    public attackLogic(sessionId: string) {
        if(this.myPlayerAnimator.GetBool("isZombie") == true){
            this.room.Send("attackLogic", sessionId)
        }
    }

    //나의 감염시 움직임 제어 남은 모션만 추가
    *InfectCoRoutine() {
        this.myPlayer.character.characterController.enabled = false;
        this.myPlayerAnimator.SetTrigger("BeCatched");
        yield null;

        let elapsedTime:number = 0;
        this.myPlayer.character.transform.rotation = Quaternion.identity;
        while (elapsedTime < 3) {
            this.myPlayer.character.transform.rotation = Quaternion.identity;
            elapsedTime += Time.deltaTime;
            yield null;
        }
        this.myPlayer.character.characterController.enabled = true;
    }

    private ParseVector3(vector3:Vector3): UnityEngine.Vector3 {
        return new UnityEngine.Vector3(
            vector3.x,
            vector3.y,
            vector3.z
        );
    }

    private SendState(state: CharacterState) {
        const data = new RoomData();
        data.Add("state", state);
        this.room.Send("onChangedState", data.GetObject());
    }

    private OnJoinPlayer(sessionId: string, player: Player) {
        console.log(`onjoins ${sessionId}`)
        this.currentPlayers.set(sessionId, player)
        this.minimapManager.addOther(player);
        const spawnInfo = new SpawnInfo();
        const position = new UnityEngine.Vector3(0, 0, 0);
        const rotation = new UnityEngine.Vector3(0, 0, 0);
        spawnInfo.position = position
        spawnInfo.rotation = UnityEngine.Quaternion.Euler(rotation)

        const isLocal = this.room.SessionId === player.sessionId;
        ZepetoPlayers.instance.CreatePlayerWithUserId(sessionId, player.zepetoUserId, spawnInfo, isLocal);
    }

    private OnLeavePlayer(sessionId: string, player: Player) {
        console.log(`room leave session id : ${sessionId}`);
        this.currentPlayers.delete(sessionId);
        this.minimapManager.deleteOther(player);
        ZepetoPlayers.instance.RemovePlayer(sessionId)
    }

    //변경위치 룸으로 전송하기 , T : 보내기
    //룸은 onMessage에서 수신받음
    private sendTransform(transform: UnityEngine.Transform) {
        const data = new RoomData();
        const pos = new RoomData()
        pos.Add('x', transform.localPosition.x);
        pos.Add('y', transform.localPosition.y);
        pos.Add('z', transform.localPosition.z);
        data.Add('position', pos.GetObject());

        const rotation = new RoomData();
        rotation.Add('x', transform.localEulerAngles.x);
        rotation.Add('y', transform.localEulerAngles.y);
        rotation.Add('z', transform.localEulerAngles.z);
        data.Add('rotation', rotation.GetObject());
        this.room.Send("onChangedTransform", data.GetObject());
    }

    private UpdateStartTimer(time: number) {
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        this.startTimer.text = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    private updateWinUi(msg:string) {
        this.winText.text = msg;
        this.gameWinText.text = `-${msg}-`;
        //게임 결과 화면 띄우기
        this.resultPanel.SetActive(true);
        //랭크 점수 추가
        //기본점수
        //좀비win - 숙주좀비+100, 일반좀비-20
        //인간win - 인간+100, 숙주좀비-50, 일반좀비-20
        //활동점수
        //좀비- 인간 감염 한명당 +20
        //인간- 상자 열기 하나당 +20
        this.score.text = `${this.rankScore}`
        var plusScore = 0
        //기본점수 계산
        if(msg == "Zombie Win!!"){
            if(this.startZombie == true) {
                plusScore += 100
                this.deAliveImage.color = Color.gray;
                this.deStartZombieImage.color = Color.white;
                this.deZombieImage.color = Color.gray;
                this.deStartZombieScore.text = "+100";
            }
            else {
                plusScore += -20
                this.deAliveImage.color = Color.gray;
                this.deStartZombieImage.color = Color.gray;
                this.deZombieImage.color = Color.white;
                this.deStartZombieScore.text = "-20";
            }
        }
        else if(msg == "Human Win!!"){
            if(this.myPlayer.character.tag != "Zombie") {
                plusScore += 100
                this.deAliveImage.color = Color.white;
                this.deStartZombieImage.color = Color.gray;
                this.deZombieImage.color = Color.gray;
                this.deStartZombieScore.text = "+100";
            }
            else if(this.startZombie == true) {
                plusScore += -50
                this.deAliveImage.color = Color.gray;
                this.deStartZombieImage.color = Color.white;
                this.deZombieImage.color = Color.gray;
                this.deStartZombieScore.text = "-50";
            }
            else {
                plusScore += -20
                this.deAliveImage.color = Color.gray;
                this.deStartZombieImage.color = Color.gray;
                this.deZombieImage.color = Color.white;
                this.deStartZombieScore.text = "-20";
            }
        }
        //활동점수 계산
        let activScore = this.catchHumanCount*20 + this.openBoxCount*20;
        this.deHumanCatchCountText.text = `x${this.catchHumanCount}`;
        this.deHumanCatchCountScore.text = `+${this.catchHumanCount*20}`;
        this.deBoxopenCountText.text = `x${this.openBoxCount}`;
        this.deBoxopenCountScore.text = `+${this.openBoxCount*20}`;
        //총 점수 계산 및 랭크 점수 추가
        plusScore += activScore;
        this.rankScore += plusScore;
        //총 점수 표시
        if(plusScore >= 0) this.plusScore.text = `+${plusScore}`;
        else this.plusScore.text = `${plusScore}`;
        //rank 점수 서버에 저장
        this.room.Send("rankScoreUpdate", this.rankScore)
        //게임 개인 설정 초기화
        this.startZombie = false;
        this.catchHumanCount = 0;
        this.openBoxCount = 0;
    }
    private updateWinUiTest() {
        console.log("test")
        let msg = "Human Win!!";
        this.catchHumanCount = 2;
        this.openBoxCount = 1;
        this.winText.text = msg;
        this.gameWinText.text = `-${msg}-`;
        //게임 결과 화면 띄우기
        this.resultPanel.SetActive(true);
        //랭크 점수 추가
        //기본점수
        //좀비win - 숙주좀비+100, 일반좀비-20
        //인간win - 인간+100, 숙주좀비-50, 일반좀비-20
        //활동점수
        //좀비- 인간 감염 한명당 +20
        //인간- 상자 열기 하나당 +20
        this.score.text = `${this.rankScore}`
        var plusScore = 0
        //기본점수 계산
        if(msg == "Zombie Win!!"){
            if(this.startZombie == true) {
                plusScore += 100
                this.deAliveImage.color = new Color(56/255, 56/255, 56/255);
                this.deStartZombieImage.color = Color.white;
                this.deZombieImage.color = new Color(56/255, 56/255, 56/255);
                this.deAliveScore.text = "+0";
                this.deStartZombieScore.text = "+100";
                this.deZombieScore.text = "+0";
            }
            else {
                plusScore += -20
                this.deAliveImage.color = new Color(56/255, 56/255, 56/255);
                this.deStartZombieImage.color = new Color(56/255, 56/255, 56/255);
                this.deZombieImage.color = Color.white;
                this.deAliveScore.text = "+0";
                this.deStartZombieScore.text = "+0";
                this.deZombieScore.text = "-20";
            }
        }
        else if(msg == "Human Win!!"){
            if(this.myPlayer.character.tag != "Zombie") {
                plusScore += 100
                this.deAliveImage.color = Color.white;
                this.deStartZombieImage.color = new Color(56/255, 56/255, 56/255);
                this.deZombieImage.color = new Color(56/255, 56/255, 56/255);
                this.deAliveScore.text = "+100";
                this.deStartZombieScore.text = "+0";
                this.deZombieScore.text = "+0";
            }
            else if(this.startZombie == true) {
                plusScore += -50
                this.deAliveImage.color = new Color(56/255, 56/255, 56/255);
                this.deStartZombieImage.color = Color.white;
                this.deZombieImage.color = new Color(56/255, 56/255, 56/255);
                this.deAliveScore.text = "+0";
                this.deStartZombieScore.text = "-50";
                this.deZombieScore.text = "+0";
            }
            else {
                plusScore += -20
                this.deAliveImage.color = new Color(56/255, 56/255, 56/255);
                this.deStartZombieImage.color = new Color(56/255, 56/255, 56/255);
                this.deZombieImage.color = Color.white;
                this.deAliveScore.text = "+0";
                this.deStartZombieScore.text = "+0";
                this.deZombieScore.text = "-20";
            }
        }
        //활동점수 계산
        let activScore = this.catchHumanCount*20 + this.openBoxCount*20;
        this.deHumanCatchCountText.text = `x${this.catchHumanCount}`;
        this.deHumanCatchCountScore.text = `+${this.catchHumanCount*20}`;
        this.deBoxopenCountText.text = `x${this.openBoxCount}`;
        this.deBoxopenCountScore.text = `+${this.openBoxCount*20}`;
        //총 점수 계산 및 랭크 점수 추가
        plusScore += activScore;
        this.rankScore += plusScore;
        //총 점수 표시
        if(plusScore >= 0) this.plusScore.text = `+${plusScore}`;
        else this.plusScore.text = `${plusScore}`;
        //rank 점수 서버에 저장
        console.log("서버에 저장 rank",typeof this.rankScore)
        this.room.Send("rankScoreUpdate", this.rankScore)
        //게임 개인 설정 초기화
        this.startZombie = false;
        this.catchHumanCount = 0;
        this.openBoxCount = 0;
    }

    private updatePlayerNumber(playerNum: number) {
        console.log(playerNum)
        this.startTimer.text = `${playerNum} / 5`
        console.log(`${this.startTimer.text}`)
    }

    //rank 점수 받아온 거 lobby canvas에 텍스트로 띄우기
    private updatePlayerRankScore(score: number){
        // rank 점수 설정
        this.rankScore = Number(score);
        // 연결한 오브젝트에 랭크 점수 띄우기
    }

    //숙주좀비 설정
    private setStartZombie(message: boolean){
        this.startZombie = message;
    }

    //감염시킨 인간 수 업데이트
    private addCatchHumanCount(message: number){
        this.catchHumanCount += message;
    }

    //게임 결과 화면에서 '계속' 버튼 눌렀을 때 랭크 점수 화면으로 전환하기
    private resultContinue(){
        this.resultPanel.SetActive(false);
        this.rankPanel.SetActive(true);
    }

    private goLobby(){

    }

    Update() {
        if ((null == this.myPlayer) || (null == this.myCamera)) {
            return;
        }
        const lookAxisRot = Quaternion.LookRotation(this.myCamera.cameraParent.forward);
        const projRot = UnityEngine.Vector3.ProjectOnPlane(lookAxisRot.eulerAngles, UnityEngine.Vector3.right);
        // Match the rotation of the character with the forward direction of the camera.
        this.myPlayer.character.gameObject.transform.rotation = Quaternion.Euler(projRot);

        //minimap
        this.minimapManager.updateMe(this.myPlayer);
    }
    
    private doExit() {
        this.room.Send("exit", "exit");
    }

}