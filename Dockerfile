FROM node:22-alpine
WORKDIR /app
COPY index.js .
COPY students.csv .
USER node
EXPOSE 3000
CMD ["node", "index.js"]
