import { requestJson } from "./httpClient.js";

export async function createOrder(payload) {
  return requestJson("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
