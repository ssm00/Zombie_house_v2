import {ZepetoScriptBehaviour} from 'ZEPETO.Script';
import {Camera, Canvas, CharacterController, Collider, GameObject, Object, Transform, Vector3} from 'UnityEngine';
import {Button} from 'UnityEngine.UI';
import {UnityEvent} from 'UnityEngine.Events';
import {ZepetoCamera, ZepetoPlayers} from 'ZEPETO.Character.Controller';
import ClosetManager from "./ClosetManager";

export default class Closet extends ZepetoScriptBehaviour {

    // Icon
    @Header("[Icon]")
    @SerializeField() private prefIconCanvas: GameObject;
    @SerializeField() private iconPosition: Transform;
    @SerializeField() private closetCamera: GameObject;

    // Unity Event
    @Header("[Unity Event]")
    public OnClickEvent: UnityEvent;
    public OnTriggerEnterEvent: UnityEvent;
    public OnTriggerExitEvent: UnityEvent;

    private _button: Button;
    private _canvas: Canvas;
    private _cachedWorldCamera: Camera;
    private _isIconActive: boolean = false;
    private _isDoneFirstTrig: boolean = false;

    //옷장
    public closetOutPosition: Vector3;
    public closetHidePosition: Vector3;
    public otherUsing: string;
    public imUsing: boolean;
    public closetId: number;
    private myPlayer: GameObject;
    private myPlayerController: CharacterController;
    private myCamera: ZepetoCamera;

    private closetManager: ClosetManager;

    private Start() {
        this.closetHidePosition.x=this.transform.position.x;
        this.closetHidePosition.y=this.transform.position.y;
        this.closetHidePosition.z=this.transform.position.z+0.1;
        this.closetOutPosition.x=this.transform.transform.position.x;
        this.closetOutPosition.y=this.transform.transform.position.y;
        this.closetOutPosition.z=this.transform.transform.position.z-0.8;
        this.closetManager = ClosetManager.getInstance();
        this.imUsing = false;
        this.otherUsing = null;
        /**
         * AddListener연결시 화살표함수를 사용하지 않으면 this가 콜백함수를 참조함
         * 일반 메소드로 사용하고 싶으면 bind를 사용해서 this를 넘겨줘야함
         */
        ZepetoPlayers.instance.OnAddedLocalPlayer.AddListener(() => {
            this.myCamera = ZepetoPlayers.instance.LocalPlayer.zepetoCamera
        });
    }
    // private Update() {
    //     if (this._isDoneFirstTrig && this._canvas?.gameObject.activeSelf) {
    //         this.UpdateIconRotation();
    //     }
    // }
    
    private OnTriggerEnter(coll: Collider) {
        if (coll != ZepetoPlayers.instance.LocalPlayer?.zepetoPlayer?.character.GetComponent<Collider>() || coll.gameObject.tag == "Player") {
            return;
        }
        this.myPlayer = coll.gameObject;
        this.myPlayerController = coll.gameObject.GetComponent<CharacterController>();

        if ((this.myPlayer.tag == "Me" && !this.otherUsing) || this.myPlayer.tag == "Zombie") {
            this.ShowIcon();
            this.OnTriggerEnterEvent?.Invoke();
        }
    }
    
    private OnTriggerExit(coll: Collider) {
        if (coll != ZepetoPlayers.instance.LocalPlayer?.zepetoPlayer?.character.GetComponent<Collider>()) {
            return;
        }
        this.HideIcon();
        this.OnTriggerExitEvent?.Invoke();
    }
    
    public ShowIcon(){
        if (!this._isDoneFirstTrig) {
            this.CreateIcon();
            this._isDoneFirstTrig = true;
        }
        else {
            this._canvas.gameObject.SetActive(true);
        }
        this._isIconActive = true;
    }
    
    public HideIcon() {
        this._canvas?.gameObject.SetActive(false);
        this._isIconActive = false;
    }
    
    private CreateIcon() {
        if (this._canvas === undefined) {
            const canvas = GameObject.Instantiate(this.prefIconCanvas, this.iconPosition) as GameObject;
            this._canvas = canvas.GetComponent<Canvas>();
            this._button = canvas.GetComponentInChildren<Button>();
            this._canvas.transform.position = this.iconPosition.position;
        }
        this._cachedWorldCamera = Object.FindObjectOfType<Camera>();
        this._canvas.worldCamera = this._cachedWorldCamera;

        this._button.onClick.AddListener(() => {
            this.OnClickIcon();
        });
    }
    
    private UpdateIconRotation() {
        this._canvas.transform.LookAt(this._cachedWorldCamera.transform);
    }

    private OnClickIcon() {
        if (this.myPlayer.tag == "Me") {
            console.log(this.imUsing)
            if (!this.imUsing) {
                this.humanClick();
            } else {
                console.log("getOUT")
                this.getOut();
            }
        }else if (this.myPlayer.tag == "Zombie") {
            this.zombieClick();
        }
    }

    private humanClick() {
        this.myPlayerController.enabled = false;
        this.myPlayer.transform.position = this.closetHidePosition;
        this.myPlayerController.enabled = true;
        this.myCamera.gameObject.SetActive(false);
        this.closetCamera.gameObject.SetActive(true);
        this.imUsing = true;
        //server에 위치 동기화를 위해 들어갔음 알리기
        this.closetManager.sendServerMoveIntoCloset(this.closetId);
    }

    /**
     * 좀비는 꺼내기만 구현 하면됨 들어가는 일없음
     * 1 내가 꺼내기 T:(M:M)
     * 2 다른 좀비가 남을 꺼내는 화면 T:(O:O) ??
     */
    private zombieClick() {
        // 1
        if (this.otherUsing != null) {
            this.exitOtherFromCloset(this.otherUsing);
            //꺼내진 사람 입장에서 꺼내졌음 동기화를 위해 server 통신
            this.closetManager.sendZombiePullOver(this.closetId, this.otherUsing);
        }
    }
    
    /**
     * 1 내가 나오기 T:(M:M)
     * 2 좀비한테 꺼내지기 화면 T:(M:M)
     */
    public getOut() {
        this.myPlayerController.enabled = false;
        const getOutPosition = new Vector3(this.closetHidePosition.x, this.closetHidePosition.y, this.closetHidePosition.z - 0.8);
        console.log(getOutPosition.x, getOutPosition.y, getOutPosition.z)
        this.myPlayer.transform.position = getOutPosition;
        this.myPlayerController.enabled = true;
        this.myCamera.gameObject.SetActive(true);
        this.closetCamera.gameObject.SetActive(false);
        this.imUsing = false;
        //server에 위치 동기화를 위해 나왔음 알리기
        this.closetManager.sendServerExitCloset(this.closetId);
    }

    /**
     * 다른 사람 closet 안으로 넣기 (동기화) T:M(O)
     */
    public moveOtherIntoCloset(sessionId:string) {
        const zepetoPlayer = ZepetoPlayers.instance.GetPlayer(sessionId);
        zepetoPlayer.character.characterController.enabled = false;
        zepetoPlayer.character.transform.position = this.closetHidePosition;
        zepetoPlayer.character.characterController.enabled = true;
        this.otherUsing = sessionId;
    }

    /**
     * 다른 사람이 closet안에서 나왔을때 동기화 T:M(O)
     */
    public exitOtherFromCloset(sessionId: string) {
        const zepetoPlayer = ZepetoPlayers.instance.GetPlayer(sessionId);
        zepetoPlayer.character.characterController.enabled = false;
        zepetoPlayer.character.transform.position = this.closetOutPosition;
        zepetoPlayer.character.characterController.enabled = true;
        this.otherUsing = null;
    }

    public setClosetId(closetId: number) {
        this.closetId = closetId;
    }

}   