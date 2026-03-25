FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw
RUN ./mvnw -q -DskipTests dependency:go-offline

COPY src ./src
RUN ./mvnw -q -DskipTests clean package

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /app/target/ambercity-backend-0.0.1-SNAPSHOT.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT} -jar /app/app.jar"]
