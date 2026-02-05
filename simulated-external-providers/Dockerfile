FROM node:20-alpine

WORKDIR /app

RUN npm install -g json-server

EXPOSE 3000

ENV ID_FIELD=id

CMD sh -c "json-server --watch /data/db.json --host 0.0.0.0 --id ${ID_FIELD}"
