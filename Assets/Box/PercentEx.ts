import { ZepetoScriptBehaviour } from 'ZEPETO.Script';
import { Camera, Canvas, Collider, GameObject, Transform, Object, AnimationClip, Animation, Time} from 'UnityEngine';
import { Slider , Button} from 'UnityEngine.UI';
import { UnityEvent } from 'UnityEngine.Events';
import { ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { collapseTextChangeRangesAcrossMultipleVersions } from 'typescript';
import Client from "../Client";
 
export default class PercentEx extends ZepetoScriptBehaviour {
    
    // Icon
    @Header("[Icon]")
    @SerializeField() private prefIconCanvas: GameObject;
    @SerializeField() private percent: GameObject;
    @SerializeField() private iconPosition: Transform;
    public boxId: number;

    // Unity Event
    @Header("[Unity Event]")
    public OnClickEvent: UnityEvent;
    public OnTriggerEnterEvent: UnityEvent;
    public OnTriggerExitEvent: UnityEvent;

    private buttonCheck: boolean=false;

    private _button: Button;
    private _canvas1: Canvas;
    private _canvas2: Canvas;
    private _cachedWorldCamera: Camera;
    private _isIconActive: boolean = false;
    private _isDoneFirstTrig: boolean = false;
    private animation : Animation;

    // 백신 시간 체크
    private startTime : number = 0;
    private finishTime : number = 5;
    private TimeCheck : boolean = false;
    private isTimePercent: Slider;


    //
    private client: Client;

    public setBoxId(id: number) {
        this.boxId = id;
    }

    private Start() {
        this.client = GameObject.FindObjectOfType<Client>();
        this.animation=this.gameObject.GetComponentInParent<Animation>();
        this.CreateSlide();
        this.CreateIcon();
        this._canvas2.gameObject.SetActive(false);
    }
    private Update() {
        if (this._isDoneFirstTrig && this._canvas1.gameObject.activeSelf) {
            this.UpdateIconRotation();
        }
        if(this.TimeCheck) {
            this.HideIcon();
            this.startTime+=Time.deltaTime;
            this._canvas2.gameObject.SetActive(true);
            this.isTimePercent.value=this.startTime;
            if(this.startTime>this.finishTime) {
                this.buttonCheck=true;
                this.HideSlide();
                this.AnimationPlay();
                //여기에 백신현황
                this.client.openBox(this.boxId);
                this.gameObject.tag = "OpenBox"
                //여기에 백신현황
                this.isTimePercent.value=0;
                this.TimeCheck=false;
            }

        }
    }

    //남이 박스를 연 경우 동기화
    public forceOpen() {
        this.HideIcon();
        this.HideSlide();
        this.AnimationPlay();
        this.isTimePercent.value=0;
        this.TimeCheck=false;
    }


    private OnTriggerEnter(coll : Collider) {
        if(coll.gameObject.tag=="Me" && this.buttonCheck==false) {
            if (coll != ZepetoPlayers.instance.LocalPlayer?.zepetoPlayer?.character.GetComponent<Collider>()) {
            return;
            }
        
            console.log(coll.gameObject.tag);
            this.ShowIcon();
            this.OnTriggerEnterEvent?.Invoke();
        }
    }
 
    private OnTriggerExit(coll : Collider) {
        if(coll.gameObject.tag=="Me"&& this.buttonCheck==false) {
            if (coll != ZepetoPlayers.instance.LocalPlayer?.zepetoPlayer?.character.GetComponent<Collider>()) {
                return;
            }
            this.isTimePercent.value=0;
            this.TimeCheck=false;
            this.startTime=0;
            this.HideIcon();
            this.HideSlide();
            this.OnTriggerExitEvent?.Invoke();
        }    
    }
     
    public ShowIcon(){
        this._canvas1.gameObject.SetActive(true);
        this._isIconActive = true;
    }
     
    public HideIcon() {
        this._canvas1.gameObject.SetActive(false);
        this._isIconActive = false;
    }
 
    private CreateIcon() {
        if (this._canvas1 === undefined) {
            const canvas1 = GameObject.Instantiate(this.prefIconCanvas, this.iconPosition) as GameObject;
            this._canvas1 = canvas1.GetComponent<Canvas>();
            this._button = canvas1.GetComponentInChildren<Button>();
            this._canvas1.transform.position = this.iconPosition.position;
        }
        this._cachedWorldCamera = Object.FindObjectOfType<Camera>();
        this._canvas1.worldCamera = this._cachedWorldCamera;
        this._canvas1.gameObject.SetActive(false);
 
        this._button.onClick.AddListener(() => {
            this.OnClickIcon();
        });
    }

    private CreateSlide() {
        const canvas2 = GameObject.Instantiate(this.percent,this.iconPosition) as GameObject;
        this._canvas2 = canvas2.GetComponent<Canvas>();
        this.isTimePercent = canvas2.GetComponentInChildren<Slider>();
        this._canvas2.transform.position = this.iconPosition.position;
        this._cachedWorldCamera = Object.FindObjectOfType<Camera>();
        this._canvas2.worldCamera = this._cachedWorldCamera;
    }

    private HideSlide() {
        this._canvas2.gameObject.SetActive(false);
        this._isIconActive = false;
    }
     
    private UpdateIconRotation() {
        this._canvas1.transform.LookAt(this._cachedWorldCamera.transform);
    }
 
    private OnClickIcon() {
        this.OnClickEvent?.Invoke();
        this.TimeCount();
        
    }
    private AnimationPlay() {
        this.animation.Play("Crate_Open");
    }    
    private TimeCount() {
        this.TimeCheck=true;
    }
    
}