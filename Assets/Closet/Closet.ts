import { ZepetoScriptBehaviour } from 'ZEPETO.Script';
import {
    Camera,
    Canvas,
    Collider,
    GameObject,
    Transform,
    Object,
    AnimationClip,
    Animation,
    Time,
    Vector3,
    CharacterController, BoxCollider
} from 'UnityEngine';
import { Button, Text } from 'UnityEngine.UI';
import { UnityEvent } from 'UnityEngine.Events';
import { ZepetoCharacter, ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { Position } from 'UnityEngine.UIElements';
import { ZepetoPlayer, ZepetoCamera } from 'ZEPETO.Character.Controller';
import { collapseTextChangeRangesAcrossMultipleVersions } from 'typescript';
import ClosetManager from "./ClosetManager";

export default class Closet extends ZepetoScriptBehaviour {

    // Icon
    @Header("[Icon]")
    @SerializeField() private prefIconCanvas: GameObject;
    @SerializeField() private iconPosition: Transform;
    @SerializeField() private humanCatchButton: Button;
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
    public isUsing: boolean;
    private closetId: number;
    private myPlayer: GameObject;
    private myPlayerController: CharacterController;
    private frontCollider: BoxCollider;
    private myCamera: ZepetoCamera;

    private closetManager: ClosetManager;

    private static instance;
    public static getInstance() {
        if (this.instance == null) {
            this.instance = GameObject.FindObjectOfType<Closet>();
        }
        return this.instance
    }

    private Start() {
        this.closetHidePosition.x=this.transform.position.x;
        this.closetHidePosition.y=this.transform.position.y;
        this.closetHidePosition.z=this.transform.position.z+0.3;
        this.closetOutPosition.x=this.transform.position.x;
        this.closetOutPosition.y=this.transform.position.y;
        this.closetOutPosition.z=this.transform.position.z-1.5;
        this.isUsing = false;
        this.closetManager = ClosetManager.getInstance();
        this.frontCollider = this.transform.parent.GetComponent<BoxCollider>();
        this.humanCatchButton.onClick.AddListener(() => this.getOut());
        ZepetoPlayers.instance.OnAddedLocalPlayer.AddListener(() => {
            this.myCamera = ZepetoPlayers.instance.LocalPlayer.zepetoCamera
        });
    }
    private Update() {
        if (this._isDoneFirstTrig && this._canvas?.gameObject.activeSelf) {
            this.UpdateIconRotation();
        }
    }
    
    private OnTriggerEnter(coll: Collider) {
        if (coll != ZepetoPlayers.instance.LocalPlayer?.zepetoPlayer?.character.GetComponent<Collider>() || coll.gameObject.tag != "Me") {
            return;
        }
        if (!this.myPlayer) {
            this.myPlayer = coll.gameObject;
            this.myPlayerController = coll.gameObject.GetComponent<CharacterController>();
        }
        if (!this.isUsing) {
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
            this.humanClick();
        }else if (this.myPlayer.tag == "Zombie") {
            this.zombieClick();
        }
    }

    private humanClick() {
        this.myPlayerController.enabled = false;
        this.myPlayer.transform.position = this.closetHidePosition;
        this.humanCatchButton.gameObject.SetActive(true);
        this.myPlayerController.enabled = true;
        this.myCamera.gameObject.SetActive(false);
        this.closetCamera.gameObject.SetActive(true);
        this.isUsing = true;
        //server에 위치 동기화를 위해 들어갔음 알리기
        this.closetManager.sendServerMoveIntoCloset(this.closetId);
    }
    
    
    //좀비클릭 꺼내기 어떻게 할껀지 고민좀 해보기 struct만들어서 isUsing이랑 sessionId같이 보관해도 될듯
    private zombieClick() {
        if (this.isUsing) {
            
        }
    }
    
    //playerController를 꺼야 position 강제 이동 가능
    private getOut = () =>  {
        this.myPlayerController.enabled = false;
        this.myPlayer.transform.position = this.closetOutPosition;
        this.myPlayerController.enabled = true;
        this.humanCatchButton.gameObject.SetActive(false);
        this.myCamera.gameObject.SetActive(true);
        this.closetCamera.gameObject.SetActive(false);
        this.isUsing = false;
        //server에 위치 동기화를 위해 나왔음 알리기
        this.closetManager.sendServerExitCloset(this.closetId);
    }

    /**
     * 다른 사람 closet 안으로 넣기 (동기화)
     */
    public moveOtherIntoCloset(zepetoPlayer: ZepetoPlayer) {
        zepetoPlayer.character.characterController.enabled = false;
        zepetoPlayer.character.transform.position = this.closetHidePosition;
        zepetoPlayer.character.characterController.enabled = true;
    }

    /**
     * 다른 사람이 closet안에서 나왔을때 동기화
     */
    public exitOtherFromCloset(zepetoPlayer: ZepetoPlayer) {
        zepetoPlayer.character.characterController.enabled = false;
        zepetoPlayer.character.transform.position = this.closetOutPosition;
        zepetoPlayer.character.characterController.enabled = true;
    }

    public setClosetId(closetId: number) {
        this.closetId = closetId;
    }

}   