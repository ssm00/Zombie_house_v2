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
    CharacterController
} from 'UnityEngine';
import { Button, Text } from 'UnityEngine.UI';
import { UnityEvent } from 'UnityEngine.Events';
import { ZepetoCharacter, ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { Position } from 'UnityEngine.UIElements';
import { ZepetoPlayer, ZepetoCamera } from 'ZEPETO.Character.Controller';
import { collapseTextChangeRangesAcrossMultipleVersions } from 'typescript';
import Client from "../Client";
 
export default class Closet extends ZepetoScriptBehaviour {

    // Icon
    @Header("[Icon]")
    @SerializeField() private prefIconCanvas: GameObject;
    @SerializeField() private iconPosition: Transform;
     
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
    //private myCamera: ZepetoCamera;
    private client: Client;
    public ClosetOutPosition: Vector3; 
    public ClosetHidePosition: Vector3; 
    public HidePeopleNum: number;
    private myPlayer: GameObject;
    private myPlayerController: CharacterController;
    
    private static instance;
    public static getInstance() {
        if (this.instance == null) {
            this.instance = GameObject.FindObjectOfType<Closet>();
        }
        return this.instance
    }

    private Start() {
        this.client = GameObject.FindObjectOfType<Client>();
        this.ClosetHidePosition.x=this.transform.position.x;
        this.ClosetHidePosition.y=this.transform.position.y-1;
        this.ClosetHidePosition.z=this.transform.position.z;
        this.HidePeopleNum=0;
        // 카메라 고정
        /*ZepetoPlayers.instance.OnAddedLocalPlayer.AddListener(() => {
            this.myCamera = ZepetoPlayers.instance.LocalPlayer.zepetoCamera
        });*/
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
        this.ShowIcon();
        this.OnTriggerEnterEvent?.Invoke();
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
        this.OnClickEvent?.Invoke();
        console.log(this.myPlayer)
        console.log(this.myPlayer.gameObject)
        this.myPlayerController.enabled = false;
        this.myPlayer.transform.position = this.ClosetHidePosition;
        this.myPlayerController.enabled = true;
        //this.HideCharacter();
    }

    private HideCharacter() {
        console.log("hide");
        //this.myCamera.StateMachine.Stop(); 카메라 고정
        this.client.moveIntoCloset();
    }
    
    public DistanceCheck(PlayerPosition:Vector3,HidePosition:Vector3) {
        return Vector3.Distance(PlayerPosition,HidePosition);
    }
}   