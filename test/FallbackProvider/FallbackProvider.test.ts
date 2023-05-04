import {
  FallbackProvider,
  validateAndGetNetwork,
  FallbackProviderError,
} from "../../src/FallbackProvider";

import FailingProvider from "./helpers/FailingProvider";
import MockProvider from "./helpers/MockProvider";

describe("FallbackProvider", () => {
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  describe("validateAndGetNetwork", () => {
    it("should throw an error if no provider is provided", async () => {
      await expect(validateAndGetNetwork([])).rejects.toThrowError(
        FallbackProviderError.NO_PROVIDER
      );
    });
    it("should throw an error if it cannot detect providers network", async () => {
      const provider1 = new MockProvider("1", 0);
      const provider2 = new MockProvider("2", 0);

      await expect(validateAndGetNetwork([provider1, provider2])).rejects.toThrowError(
        FallbackProviderError.CANNOT_DETECT_NETWORKS
      );
    });
    it("should throw an error if all providers are not connected to the same network", async () => {
      const provider1 = new MockProvider("1", 1);
      const provider2 = new MockProvider("2", 2);

      await expect(validateAndGetNetwork([provider1, provider2])).rejects.toThrowError(
        FallbackProviderError.INCONSISTENT_NETWORKS
      );
    });
    it("should return the providers' network and the list of available providers", async () => {
      const provider1 = new MockProvider("1", 1);
      const provider2 = new MockProvider("2", 0);
      const provider3 = new MockProvider("3", 1);

      const { network, providers } = await validateAndGetNetwork([provider1, provider2, provider3]);

      expect(network.chainId).toEqual(1);
      expect(providers).toHaveLength(2);
      expect(providers[0]).toEqual(provider1);
      expect(providers[1]).toEqual(provider3);
    });
  });

  describe("perform", () => {
    it("should return the first value if the first provider is successful", async () => {
      const provider1 = new MockProvider("1");
      const provider2 = new MockProvider("2");
      const provider = new FallbackProvider([provider1, provider2]);

      jest.spyOn(provider1, "perform");
      jest.spyOn(provider2, "perform");

      const res = await provider.perform("send", {});

      expect(provider1.perform).toHaveBeenCalledTimes(1);
      expect(provider2.perform).not.toHaveBeenCalled();
      expect(res).toEqual("1");
    });

    it("should return the second value if the first provider is failing", async () => {
      const provider1 = new FailingProvider("1");
      const provider2 = new MockProvider("2");
      const provider = new FallbackProvider([provider1, provider2]);

      jest.spyOn(provider1, "perform");
      jest.spyOn(provider2, "perform");

      const res = await provider.perform("send", {});

      expect(provider1.perform).toHaveBeenCalledTimes(1);
      expect(provider2.perform).toHaveBeenCalledTimes(1);
      expect(res).toEqual("2");
    });

    it("should fail if all providers are failing", async () => {
      const provider1 = new FailingProvider("1");
      const provider2 = new FailingProvider("2");
      const provider = new FallbackProvider([provider1, provider2]);

      jest.spyOn(provider1, "perform");
      jest.spyOn(provider2, "perform");

      await expect(provider.perform("send", {})).rejects.toThrowError("Failing provider used: 2");

      expect(provider1.perform).toHaveBeenCalledTimes(1);
      expect(provider2.perform).toHaveBeenCalledTimes(1);
    });
  });
});
