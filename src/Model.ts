import Mongoose from "mongoose";

export interface ModelInterface extends Mongoose.Document {
  id: string;
  online: boolean | void;
  lastCheck: string;
  pings: Ping[];
}

export class Ping {
  public date: string;

  constructor(public online: boolean) {
    this.date = new Date().toDateString();
  }
}

const Model = Mongoose.model<ModelInterface>(
  "Bots",
  new Mongoose.Schema({
    id: { required: true, type: String },
    online: { default: false, type: Boolean },
    lastCheck: { required: true, type: String },
    pings: { required: true, type: Array, default: [] },
  })
);

export default Model;
