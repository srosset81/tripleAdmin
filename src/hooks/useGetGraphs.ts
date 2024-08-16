import { useCallback, useContext } from "react";
import useStorage from "./useStorage";
import { AppStateContext } from "../contexts/appStateContext";

type Response = {
  head: {
    vars: string[];
  };
  results: {
    bindings: {
      g: {
        type: string;
        value: string;
      };
    }[];
  };
};

const useGetGraphs = () => {
  const appState = useContext(AppStateContext);
  const { state: { server: { attributes } } } = appState;

  const { getAuthData } = useStorage();

  const authData = getAuthData();

  const getGraphs = useCallback(
    async (dataset: string) => {
      if (!authData.host || !authData.credentials || !attributes) {
        location.reload();
        return [];
      }

      const { host, credentials } = authData;
      const currentDataset = attributes.datasets.find(
        (d) => d["ds.name"] === dataset
      );

      if (!currentDataset) {
        throw new Error(`Unknown dataset "${dataset}"`);
      }

      const response = await fetch("/api/server", {
        method: "POST",
        headers: {
          "X-TripleHost": host.endsWith("/") ? host.slice(0, -1) : host,
          "X-TriplePath": currentDataset["ds.name"],
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify({
          query: `
          SELECT ?g
          WHERE {
            GRAPH ?g { }
          }
        `,
        }),
      });

      if (response.ok) {
        const content = (await response.json()) as QueryResponse;
        return content.results.bindings.map((binding) => binding.g.value);
      }

      if (response.status === 401) {
        throw new Error("Bad credentials");
      }

      throw new Error("Unable to connect to host");
    },
    [authData, attributes]
  );

  return { getGraphs };
};

export default useGetGraphs;
