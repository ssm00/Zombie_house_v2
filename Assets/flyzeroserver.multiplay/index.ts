import {Sandbox, SandboxOptions, SandboxPlayer} from "ZEPETO.Multiplay";
import {DataStorage} from "ZEPETO.Multiplay.DataStorage";
import {Box, Player, Transform, Vector3} from "ZEPETO.Multiplay.Schema";

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
            this.broadcast("attackMotionInvoke", client.sessionId)
        });

        //공격 성공 로직
        this.onMessage("attackLogic", (client: SandboxPlayer, sessionId: string) => {
            const infectedPlayer = this.state.players.get(sessionId);
            if (infectedPlayer) {
                infectedPlayer.role = "Zombie";
                // "Zombie" 역할인 플레이어 수 세기
                const zombieCount = Array.from(this.state.players.values()).filter(player => player.role === "Zombie").length;
                this.broadcast("userColorUpdate",zombieCount);
                //끝 확인
                if (zombieCount == this.state.players.size) {
                    this.broadcast("zombieWin", "zombieWin");
                    clearInterval(this.mainTimerId);
                    this.lockCancel();
                    this.kickAll();
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
                this.broadcast("otherOpenBox",boxId);
                this.broadcast("boxColorUpdate",openedBoxesCount);
                if (openedBoxesCount == 3) {
                    this.broadcast("humanWin", "humanWin");
                    clearInterval(this.mainTimerId);
                    this.lockCancel();
                    this.kickAll();
                }
            }
        });

        //다시하기
        this.onMessage("again", (client: SandboxPlayer, message: string) => {
            this.broadcast("attackMotionInvoke", client.sessionId)
        });

        //나가기
        this.onMessage("exit", (client: SandboxPlayer, message: string) => {
            this.tryKick(client.sessionId);
        });

    }

    async onJoin(client: SandboxPlayer) {
        console.log(`[OnJoin] sessionId : ${client.sessionId}, userId : ${client.userId}`)

        const player = new Player();
        player.sessionId = client.sessionId;
        player.role = "Human"
        player.isCrouch = false

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
        this.startGameStartTimer(5)
    }

    private startGameStartTimer(time:number) {
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
                this.broadcast("zombieWin", "zombieWin");
                this.kickAll();
            } else {
                this.broadcast("mainTimer", time)
                time--;
            }
        }, 1000); // 1초 간격으로 실행
    }

    private async startGameSetting() {
        if (this.state.players.size == this.playerNumber) {
            this.zombieSelect();
            this.boxPositionSetting(3);
            this.mainGameTimer(300);
            await this.lock();
        }
    }

    private async lockCancel() {
        try {
            await this.unlock();
        } catch(e) {
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
            this.broadcast("userColorUpdate",1);
        }
    }

    private boxPositionSetting(boxNumber:number) {
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
        let boxTransformList: Transform[] = [transform1, transform2, transform3, transform4, transform5, transform6, transform7, transform8, transform9, transform10];
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

    private makeTransform(px:number,py:number,pz:number,rx:number,ry:number,rz:number) {
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
    }

    async tryKick(sessionId: string) {
        const player = this.loadPlayer(sessionId);
        if (player) {
            await this.kick(player);
        }
    }

    private kickAll() {
        let time = 3;
        setInterval(() => {
            if (time <= 0) {
                this.state.players.forEach((player) => {
                    this.tryKick(player.sessionId);
                });
            } else {
                time--;
            }
        }, 1000); // 1초 간격으로 실행
    }
}