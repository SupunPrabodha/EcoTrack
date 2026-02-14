import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "EcoTrack API", version: "1.0.0" },
    servers: [{ url: "/api" }],
  },
  apis: ["./src/routes/*.js"], // you can add JSDoc annotations later; for Eval 01, Postman collection is also acceptable
});
