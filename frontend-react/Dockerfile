FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173

# --host makes Vite listen on all interfaces so the mapped port is
# reachable from outside the container, not just localhost inside it.
CMD ["npm", "run", "dev", "--", "--host"]