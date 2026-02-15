import { Group } from "@semaphore-protocol/group"
import {hexToNumber, numberToHexUnpadded} from "@noble/curves/utils.js";
import db from "../configs/database";

export class ZKP {
    private group = new Group();

    public async initializeGroup() : Promise<void> {
        const [commitments] = await db.query('SELECT commitment FROM commitments');
        (commitments as {commitment: string}[]).forEach(({ commitment }) => {
            this.addToGroup(commitment);
        });
    }

    public getGroup() : BigInt[] {
        return this.group.members
    }

    public addToGroup(commitment: string) : void {
        this.group.addMember(hexToNumber(commitment));
    }

    public getMerkleProof(id : number) : any {
         return this.group.generateMerkleProof(id)
    }
}

