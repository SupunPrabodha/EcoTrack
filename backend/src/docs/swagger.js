import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EcoTrack API",
      version: "1.0.0",
      description:
        "EcoTrack REST API for habit tracking, emissions analytics, goals/accountability, and eco recommendations.",
    },
    servers: [{ url: "/api", description: "Relative API base" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
});
