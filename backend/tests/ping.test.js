import request from "supertest";
import app from "../test/testApp.js";

describe("GET /ping", () => {
  it("should return health status", async () => {
    const res = await request(app)
      .get("/ping")
      .set("Origin", "http://localhost:5173"); 
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});