FROM nginx:alpine
# The API's public URL is known before the build starts and is baked in here,
# the same way a real frontend would take VITE_API_URL or similar.
ARG API_URL
COPY index.html /usr/share/nginx/html/index.html
RUN echo "window.APP_CONFIG = { apiUrl: '${API_URL}' };" > /usr/share/nginx/html/config.js
