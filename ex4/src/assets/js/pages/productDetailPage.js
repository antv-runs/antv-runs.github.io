import { initHeader } from "../components/header.js";
import { initProductDetailPage } from "./productDetail.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("product detail loaded");
  initHeader();
  initProductDetailPage();
});
