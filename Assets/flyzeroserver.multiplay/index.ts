import {Sandbox, SandboxOptions, SandboxPlayer} from "ZEPETO.Multiplay";
import {DataStorage} from "ZEPETO.Multiplay.DataStorage";
import {Box, ClosetData, Player, Transform, Vector3} from "ZEPETO.Multiplay.Schema";
import {loadCurrency} from "ZEPETO.Multiplay.Currency";
import {loadInventory} from "ZEPETO.Multiplay.Inventory";

//server
export default class extends Sandbox {

    private playerNumber = 5;
    private mainTimerId: number = 0;

    //서버에서 사용할 함수 생성 onMessage에 등록하면 해당 messageType으로 호출 해서 사용가능 클라이언트가 사용하는 함수들
    onCreate(options: SandboxOptions) {
        // 위치움직인 경우 메시지를 보내고 받을수 있는 listener 추가
        this.onMessage("onChangedTransform", (client, message) => {
            const player = this.state.players.get(client.sessionId);

            const transform = new Transform();
            transform.position = new Vector3();
            transform.position.x = message.position.x;
            transform.position.y = message.position.y;
            transform.position.z = message.position.z;

            transform.rotation = new Vector3();
            transform.rotation.x = message.rotation.x;
            transform.rotation.y = message.rotation.y;
            transform.rotation.z = message.rotation.z;

            if (player) {
                player.transform = transform;
            }
        });

        //방에 사람이 들어왔을때 data 주고 받는 함수
        this.onMessage("onChangedState", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.state = message.state;
            }
        });

        //숙이기 상태 전송
        this.onMessage("crouch", (client: SandboxPlayer, message: boolean) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.isCrouch = message;
            }
        });

        //공격 모션 시작
        this.onMessage("attackMotion", (client: SandboxPlayer, message: string) => {
            this.broadcast("attackMotionInvoke", client.sessionId, {except: client})
        });

        //공격 성공 로직
        this.onMessage("attackLogic", (client: SandboxPlayer, sessionId: string) => {
            const infectedPlayer = this.state.players.get(sessionId);
            if (infectedPlayer) {
                infectedPlayer.role = "Zombie";
                // "Zombie" 역할인 플레이어 수 세기
                const zombieCount = Array.from(this.state.players.values()).filter(player => player.role === "Zombie").length;
                this.broadcast("userColorUpdate",zombieCount);
                // 감염시킨 인간 수 업데이트
                client.send("infectOther", 1);
                //끝 확인
                if (zombieCount == this.state.players.size) {
                    this.broadcast("gameOver", "Zombie Win!!");
                    clearInterval(this.mainTimerId);
                    this.lockCancel();
                    //this.kickAll();
                }
            }
        });

        //박스 오픈
        this.onMessage("boxOpen", (client: SandboxPlayer, boxId: number) => {
            const openBox = this.state.boxes[boxId];
            if (openBox) {
                openBox.open = true;
                // "열린박스" 갯수 세기
                // 열린 박스의 갯수 세기
                const openedBoxesCount = this.state.boxes.filter(box => box.open).length;
                this.broadcast("otherOpenBox", boxId);
                this.broadcast("boxColorUpdate", openedBoxesCount);
                if (openedBoxesCount == 3) {
                    this.broadcast("gameOver", "Human Win!!");
                    clearInterval(this.mainTimerId);
                    this.lockCancel();
                }
            }
        });

        //랭크 점수 가져오기
        this.onMessage("getRankScore", (client: SandboxPlayer, message: number) => {
            this.getRankScore(client, message);
        });

        //랭크 점수 업데이트
        this.onMessage("rankScoreUpdate", (client: SandboxPlayer, message: number) => {
            this.RankScoreUpdate(client, message);
        });

        //다시하기
        //삭제 고려 아무것도 없음 기능
        this.onMessage("again", (client: SandboxPlayer, message: string) => {
            this.broadcast("attackMotionInvoke", client.sessionId)
        });

        //나가기
        this.onMessage("exit", (client: SandboxPlayer, message: string) => {
            this.tryKick(client.sessionId);
        });

        /**
         * 옷장 들어가기
         * msg는 RoomData에 closetId, isUsing
         */
        this.onMessage("moveIntoCloset", (client: SandboxPlayer, message) => {
            this.broadcastCloset("enter", client, message);
        });

        /**
         * 옷장 나오기
         * msg는 RoomData에 closetId, isUsing
         */
        this.onMessage("exitFromCloset", (client: SandboxPlayer, message) => {
            this.broadcastCloset("exit", client, message);
        });

        /**
         * 좀비가 끄집어내기
         */
        this.onMessage("zombiePullOver", (client: SandboxPlayer, message) => {
            const closetData = new ClosetData();
            closetData.id = message.closetId;
            closetData.sessionId = message.sessionId;
            this.broadcast("zombiePullOverFetch", closetData);
        });

        /**
         * 캐릭터 스킬 사용
         * 이동과 관련된 부분은 동기화 필요함
         * 공격속도는 플레이어 버튼 쿨타임 변경이라 동기화 안해도됨 (이동아님)
         * 돌진
         */
        this.onMessage("lungeUsing", (client: SandboxPlayer, message) => {
            this.broadcast("lungeUsing", client.sessionId, {except: client});
        });

        /**
         * 이동속도 부스트
         */
        this.onMessage("moveSpeedUsing", (client: SandboxPlayer, boostTime: number) => {
            const moveSpeedData: MoveSpeedSkillData = {
                sessionId: client.sessionId,
                boostTime: boostTime
            };
            this.broadcast("moveSpeedUsing", moveSpeedData, {except: client});
        });


        //상점 관련 코드
        /**
         * 돈을 쓰는 경우
         * Currency ID는 coin, zem 두가지 존재
         */
        this.onMessage("onDebit", (client, message: CurrencyMessage) => {
            const currencyId = message.currencyId;
            const quantity = message.quantity;
            this.onDebit(client, currencyId, quantity);
        });

        /**
         * 돈을 얻는 경우
         */
        this.onMessage("onCredit", (client, message:CurrencyMessage) => {
            const currencyId = message.currencyId;
            const quantity = message.quantity;
            this.addCredit(client, currencyId, quantity);
        });

        /**
         * 인벤토리에서 아이템을 사용하는 경우
         * 아이템이 있는지 없는지 확인 및 링인지 캐릭터인지 확인
         */
        this.onMessage("onUseInventory", (client, message:InventoryMessage) => {

            const productId = message.productId;
            const quantity = message.quantity ?? 1;

            this.UseInventory(client, productId, quantity);
        });

        this.onMessage("onRemoveInventory", (client, message:InventoryMessage) => {

            const productId = message.productId;

            this.RemoveInventory(client, productId);
        });

        //로비 이동
        this.onMessage("goLobby", (client, message) => {
            this.broadcast("lobbyTelePort", client.sessionId)
        });
    }

    async onJoin(client: SandboxPlayer) {
        console.log(`[OnJoin] sessionId : ${client.sessionId}, userId : ${client.userId}`)
        const player = new Player();
        player.sessionId = client.sessionId;
        player.role = "Human";
        player.isCrouch = false;
        /**
         * 좀비 챔피언선택용 기본은 노멀
         * cha_normal
         * cha_movespeedup
         * cha_lunge
         * cha_attackspeedup
         */
        player.championName = "cha_normal";
        player.ringOption = "ring_red";

        if (client.hashCode) {
            player.zepetoHash = client.hashCode;
        }
        if (client.userId) {
            player.zepetoUserId = client.userId;
        }
        const storage: DataStorage = client.loadDataStorage();

        let visit_cnt = await storage.get("VisitCount") as number;
        if (visit_cnt == null) visit_cnt = 0;

        await storage.set("VisitCount", ++visit_cnt);

        this.state.players.set(client.sessionId, player);
        const size = this.state.players.size;
        this.broadcast("playerNumber", size);
        //게임시작 카운트 다운, 카운트 끝나면 좀비플레이어 설정
        this.startGameStartTimer(10)
    }

    private startGameStartTimer(time: number) {
        if (this.state.players.size == this.playerNumber) {
            const intervalId = setInterval(() => {
                if (time <= 0) {
                    clearInterval(intervalId); // 타이머 중지
                    this.startGameSetting()
                } else {
                    this.broadcast("gameStartTime", time)
                    time--;
                }
            }, 1000); // 1초 간격으로 실행
        }
    }

    private mainGameTimer(time: number) {
        this.mainTimerId = setInterval(() => {
            if (time <= 0) {
                clearInterval(this.mainTimerId); // 타이머 중지
                this.broadcast("gameOver", "Human Win!!");
            } else {
                this.broadcast("mainTimer", time)
                time--;
            }
        }, 1000); // 1초 간격으로 실행
    }

    private async startGameSetting() {
        if (this.state.players.size == this.playerNumber) {
            this.broadcast("startTeleport","startTeleport");
            await this.pause(10);
            this.broadcast("gameStartCanvas", "gameStartCanvas");
            this.zombieSelect();
            this.boxPositionSetting(5);
            this.mainGameTimer(300);
            await this.lock();
        }
    }

    private pause(seconds: number): Promise<void> {
        let remainingTime = seconds;
        return new Promise<void>((resolve) => {
            const pauseTimerId = setInterval(() => {
                if (remainingTime <= 0) {
                    clearInterval(pauseTimerId); // Timer stopped
                    resolve();
                } else {
                    remainingTime--;
                }
            }, 1000); // 1-second interval
        });
    }

    private async lockCancel() {
        try {
            await this.unlock();
        } catch (e) {
            console.error(e);
        }
    }

    private zombieSelect() {
        const zombieIndex = Math.floor(Math.random() * this.playerNumber);
        const playerList = Array.from(this.state.players.keys());
        //debug모드 랜덤 0번으로 고정 바꾸기
        const zombiePlayerSessionId = playerList[zombieIndex];
        const zombiePlayer = this.state.players.get(zombiePlayerSessionId);
        if (zombiePlayer) {
            zombiePlayer.role = "Zombie";
            this.broadcast("setStartZombie", zombiePlayer.sessionId);
            this.broadcast("userColorUpdate",1);
        }
    }

    private boxPositionSetting(boxNumber: number) {
        const transform1 = this.makeTransform(-16.58, 0, -34.55, 0, 0, 0);
        const transform2 = this.makeTransform(-4.6, 0, -27.66, 0, 180, 0);
        const transform3 = this.makeTransform(-2.372, 0, -5.327, 0, 120, 0);
        const transform4 = this.makeTransform(-16.40, 0, -3.36, 0, 180, 0);
        const transform5 = this.makeTransform(-26.52, 0, 1.21, 0, 180, 0);
        const transform6 = this.makeTransform(-33.91, 0, -19.78, 0, 90, 0);
        const transform7 = this.makeTransform(-16.44, 0, -15.07, 0, 0, 0);
        const transform8 = this.makeTransform(-26.19, 0, -15.11, 0, 0, 0);
        const transform9 = this.makeTransform(3.96, 0, -3.47, 0, 0, 0);
        const transform10 = this.makeTransform(1.68, 0, -15.57, 0, 0, 0);
        const transform11 = this.makeTransform(-19.52, 0, -26.03, 0, 0, 0);
        const transform12 = this.makeTransform(3.8, 0, 3.6, 0, -90, 0);
        const transform13 = this.makeTransform(-19.89, 0, 4.7, 0, 90, 0);
        const transform14 = this.makeTransform(-2.78, 0, -18.99, 0, -90, 0);
        const transform15 = this.makeTransform(-29.87, 0, -15.44, 0, 90, 0);
        let boxTransformList: Transform[] = [transform1, transform2, transform3, transform4, transform5, transform6, transform7, transform8, transform9, transform10, transform11, transform12, transform13, transform14, transform15];
        let selectedTransformList = this.shuffleArray(boxTransformList).slice(0, boxNumber);
        let boxId = 0;
        selectedTransformList.forEach((boxTransform) => {
            const box = new Box();
            box.transform = boxTransform;
            box.id = boxId++;
            this.state.boxes.push(box)
        });
        this.broadcast("boxSetting", selectedTransformList);
    }

    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    private makeTransform(px: number, py: number, pz: number, rx: number, ry: number, rz: number) {
        const transform = new Transform();
        transform.position = new Vector3();
        transform.position.x = px;
        transform.position.y = py;
        transform.position.z = pz;
        transform.rotation.x = rx;
        transform.rotation.y = ry;
        transform.rotation.z = rz;
        return transform;
    }

    onTick(deltaTime: number): void {
        //  It is repeatedly called at each set time in the server, and a certain interval event can be managed using deltaTime.
    }

    async onLeave(client: SandboxPlayer, consented?: boolean) {
        this.state.players.delete(client.sessionId);
        const size = this.state.players.size;
        this.broadcast("playerNumber", size);
    }

    async tryKick(sessionId: string) {
        const player = this.loadPlayer(sessionId);
        if (player) {
            await this.kick(player);
        }
    }

    // private kickAll() {
    //     let time = 3;
    //     setInterval(() => {
    //         if (time <= 0) {
    //             this.state.players.forEach((player) => {
    //                 this.tryKick(player.sessionId);
    //             });
    //         } else {
    //             time--;
    //         }
    //     }, 1000); // 1초 간격으로 실행
    // }

    /**
     * closetData를 받을때 closetId, isUsing 정보는 포함되어있음
     * 누군가 옷장에 들어간 경우 해당 옷장ID, 사용중 여부가 넘어옴
     * 옷장에서 나온 경우 사용중만 false로 바뀌고 나머지 동일하므로 코드 그냥 재사용
     * sessionId값만 추가 해서 누가 들어갔는지 전파해 주면됨
     */
    private broadcastCloset(enterOrExit: string, client: SandboxPlayer, message: any) {
        const closetData = new ClosetData();
        closetData.id = message.closetId;
        closetData.isUsing = message.isUsing;
        closetData.sessionId = client.sessionId;
        if (enterOrExit==="enter") {
            this.broadcast("otherMoveIntoCloset", closetData, {except: client});
        }else if (enterOrExit === "exit") {
            this.broadcast("otherExitCloset", closetData, {except: client});
        }
    }

    //상점 코드 시작
    async onDebit(client: SandboxPlayer, currencyId: string, quantity: number) {
        try {
            const currency = await loadCurrency(client.userId);
            if(await currency.debit(currencyId, quantity) === true) {
                const currencySync: CurrencyMessage = {
                    currencyId: currencyId,
                    quantity: -quantity
                }
                client.send("SyncBalances", currencySync);
            }
            else{
                //It's usually the case that there's no balance.
                client.send("DebitError", "Currency Not Enough");
            }
        }
        catch (e)
        {
            console.log(`${e}`);
        }
    }

    async addCredit(client: SandboxPlayer, currencyId: string, quantity: number) {

        try {
            const currency = await loadCurrency(client.userId);
            await currency.credit(currencyId, quantity);
            const currencySync: CurrencyMessage = {
                currencyId : currencyId,
                quantity : quantity
            }
            client.send("SyncBalances",currencySync);
        }
        catch (e)
        {
            console.log(`${e}`);
        }
    }

    async UseInventory(client: SandboxPlayer, productId: string, quantity: number) {

        try {
            const inventory = await loadInventory(client.userId);
            /**
             * use로 사용시 영구 아이템 false로 나와서 일단 has로 검증
             * 추후에 일회용 아이템 출시한다면 영구아이템 여부도 저장해야할듯
             */
            if (await inventory.has(productId) === true) {
                const inventorySync: InventorySync = {
                    productId: productId,
                    inventoryAction: InventoryAction.Use
                }
                client.send("SyncInventories", inventorySync);
                // 캐릭터 사용
                if (productId.startsWith("cha")) {
                    const player = this.state.players.get(client.sessionId);
                    if(player){
                        player.championName = productId;
                    }
                } else if(productId.startsWith("ring")) {
                    const player = this.state.players.get(client.sessionId);
                    if(player){
                        player.ringOption = productId;
                    }
                }
            }
            else{
                console.log("use error");
            }
        }
        catch (e)
        {
            console.log(`${e}`);
        }
    }

    async RemoveInventory(client: SandboxPlayer, productId: string) {

        try {
            const inventory = await loadInventory(client.userId);
            if (await inventory.remove(productId) === true) {
                const inventorySync: InventorySync = {
                    productId: productId,
                    inventoryAction: InventoryAction.Remove
                }
                client.send("SyncInventories", inventorySync);
                console.log("success rm");
            }
            else{
                console.log("remove error");
            }
        }
        catch (e)
        {
            console.log(`${e}`);
        }
    }

    async RankScoreUpdate(client: SandboxPlayer, score: number){
        const storage: DataStorage = client.loadDataStorage();
        await storage.set("RankScore", Number(score));
    }
    
    async getRankScore(client: SandboxPlayer, score: number){
        const storage: DataStorage = client.loadDataStorage();
        let playerRankScore = await storage.get("RankScore") as number;
        if (playerRankScore == null) playerRankScore = 0;
        await storage.set("RankScore", playerRankScore);
        client.send("rankScore", playerRankScore);
        console.log(`rank: ${playerRankScore}`, typeof playerRankScore);
    }

};

interface InventorySync {
    productId: string,
    inventoryAction: InventoryAction,
}

interface InventoryMessage {
    productId: string,
    quantity?: number,
}

interface MoveSpeedSkillData {
    sessionId: string,
    boostTime: number;
}

export interface CurrencyMessage {
    currencyId: string,
    quantity: number,
}

export enum InventoryAction{
    Remove = -1,
    Use,
    Add,

}