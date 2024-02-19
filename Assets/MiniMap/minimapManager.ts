import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ZepetoPlayer, ZepetoCamera } from "ZEPETO.Character.Controller";
import * as UnityEngine from "UnityEngine";
import { GameObject, Quaternion, Camera, Color, SpriteRenderer, Sprite } from "UnityEngine";
import {Player, State, Transform, Vector3} from "ZEPETO.Multiplay.Schema";

export default class MinimapManager extends ZepetoScriptBehaviour {

    //minimap
    public minimapCamera: Camera;
    public minimapPlayer: GameObject;

    private myPlayer: ZepetoPlayer;
    private myCamera: ZepetoCamera;
    private otherPlayers: Map<Player, GameObject> = new Map<Player, GameObject>();

    //싱글톤
    private static instance;
    public static getInstance() {
        if (this.instance == null) {
            this.instance = GameObject.FindObjectOfType<MinimapManager>();
        }
        return this.instance
    }

    public setting(player: ZepetoPlayer, playerCamera: ZepetoCamera){
        this.myPlayer = player;
        this.myCamera = playerCamera;
    }

    public addOther(player: Player){
        if(this.myPlayer != undefined){
            // 1. GameObject 생성
            const circleObject : GameObject = new GameObject("MinimapPlayer_"+player.sessionId);
            // 2. SpriteRenderer 추가
            const spriteRenderer : SpriteRenderer = circleObject.AddComponent<SpriteRenderer>();
            // 3. 기본 설정
            spriteRenderer.sprite = this.minimapPlayer.GetComponent<SpriteRenderer>().sprite;
            circleObject.transform.rotation = Quaternion.Euler(90, 0, 0);
            circleObject.layer = 7;
            circleObject.transform.position = new UnityEngine.Vector3(0, 10, 0);
            // 4. 색상 설정
            spriteRenderer.color = Color.yellow;
            // 5. map추가
            this.otherPlayers.set(player, circleObject);
        }
    }

    public deleteOther(player: Player){
        const targetObject : GameObject = this.otherPlayers.get(player);
        
        this.otherPlayers.delete(player);
    }

    public updateMe(player: ZepetoPlayer){
        this.minimapCamera.transform.position = new UnityEngine.Vector3(player.character.transform.position.x, this.minimapCamera.transform.position.y, player.character.transform.position.z);
        this.minimapPlayer.transform.position = new UnityEngine.Vector3(player.character.transform.position.x, this.minimapPlayer.transform.position.y, player.character.transform.position.z);
    }

    public updateOther(player: Player){
        if(!this.otherPlayers.has(player)){
            this.addOther(player);
        }
        const minimapOtherObject : GameObject = this.otherPlayers.get(player);
        minimapOtherObject.transform.position = new UnityEngine.Vector3(player.transform.position.x, minimapOtherObject.transform.position.y, player.transform.position.z);
        let settingColor : Color = Color.blue;
        if(this.myPlayer.character.ZepetoAnimator.isHuman == true){
            if(player.role == "Zombie"){
                settingColor = Color.red;
            }
        }
        else {
            if(player.role == "Human"){
                settingColor = Color.clear;
            }
        }
        minimapOtherObject.GetComponent<SpriteRenderer>().color = settingColor;
    }
    
}