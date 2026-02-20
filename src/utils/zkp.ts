import { Group } from "@semaphore-protocol/group"
import {hexToNumber, numberToHexUnpadded} from "@noble/curves/utils.js";
import db from "../configs/database";
import {zkp} from "../app";

export class ZKP {
    private group = new Group();

    public async initializeGroup() : Promise<void> {
        const [commitments] = await db.query('SELECT commitment FROM commitments');
        (commitments as {commitment: string}[]).forEach(({ commitment }) => {
            this.addToGroup(commitment);
        });
    }

    public async getGroup() : Promise<string[]> {

        let data: string[] = [];
        const [commitments] = await db.query('SELECT commitment FROM commitments');
        (commitments as {commitment: string}[]).forEach(({ commitment }) => {
            data.push(commitment);
        });
        console.log(data)
        return data;
    }

    public getGroupSize() : number {
        return this.group.size;
    }

    public addToGroup(commitment: string) : void {
        this.group.addMember(hexToNumber(commitment));
    }

    public getMerkleProof(id : number) : any {
         return this.group.generateMerkleProof(id)
    }
}

