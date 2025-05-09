declare module "ZEPETO.Multiplay.Schema" {

	import { Schema, MapSchema, ArraySchema } from "@colyseus/schema"; 


	interface State extends Schema {
		players: MapSchema<Player>;
		boxes: ArraySchema<Box>;
	}
	class Vector3 extends Schema {
		x: number;
		y: number;
		z: number;
	}
	class Transform extends Schema {
		position: Vector3;
		rotation: Vector3;
	}
	class Player extends Schema {
		sessionId: string;
		zepetoHash: string;
		zepetoUserId: string;
		transform: Transform;
		state: number;
		role: string;
		isCrouch: boolean;
		championName: string;
		ringOption: string;
	}
	class Box extends Schema {
		id: number;
		transform: Transform;
		open: boolean;
	}
	class ClosetData extends Schema {
		id: number;
		isUsing: boolean;
		sessionId: string;
	}
}