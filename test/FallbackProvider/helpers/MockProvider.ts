import { BaseProvider } from "@ethersproject/providers";

export default class MockProvider extends BaseProvider {
  constructor(private _id: string) {
    super(1);
  }

  async perform() {
    return this._id;
  }
}
