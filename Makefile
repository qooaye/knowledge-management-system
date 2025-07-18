# 知識管理系統 Makefile

# 預設目標
.DEFAULT_GOAL := help

# 顏色定義
CYAN = \033[0;36m
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

# 項目變數
PROJECT_NAME = knowledge-management-system
DOCKER_COMPOSE = docker-compose
DOCKER_COMPOSE_DEV = docker-compose -f docker-compose.yml

.PHONY: help
help: ## 顯示幫助信息
	@echo "$(CYAN)$(PROJECT_NAME) - 開發命令$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

.PHONY: install
install: ## 安裝所有依賴
	@echo "$(YELLOW)安裝前端依賴...$(NC)"
	cd frontend && npm install
	@echo "$(YELLOW)安裝後端依賴...$(NC)"
	cd backend && npm install
	@echo "$(YELLOW)安裝爬蟲依賴...$(NC)"
	cd crawler && npm install
	@echo "$(GREEN)依賴安裝完成！$(NC)"

.PHONY: dev
dev: ## 啟動開發環境
	@echo "$(YELLOW)啟動開發環境...$(NC)"
	$(DOCKER_COMPOSE_DEV) up --build

.PHONY: dev-d
dev-d: ## 在後台啟動開發環境
	@echo "$(YELLOW)在後台啟動開發環境...$(NC)"
	$(DOCKER_COMPOSE_DEV) up -d --build

.PHONY: stop
stop: ## 停止開發環境
	@echo "$(YELLOW)停止開發環境...$(NC)"
	$(DOCKER_COMPOSE_DEV) down

.PHONY: restart
restart: stop dev ## 重啟開發環境

.PHONY: logs
logs: ## 查看日誌
	$(DOCKER_COMPOSE_DEV) logs -f

.PHONY: logs-backend
logs-backend: ## 查看後端日誌
	$(DOCKER_COMPOSE_DEV) logs -f backend

.PHONY: logs-frontend
logs-frontend: ## 查看前端日誌
	$(DOCKER_COMPOSE_DEV) logs -f frontend

.PHONY: logs-crawler
logs-crawler: ## 查看爬蟲日誌
	$(DOCKER_COMPOSE_DEV) logs -f crawler

.PHONY: shell-backend
shell-backend: ## 進入後端容器
	$(DOCKER_COMPOSE_DEV) exec backend sh

.PHONY: shell-frontend
shell-frontend: ## 進入前端容器
	$(DOCKER_COMPOSE_DEV) exec frontend sh

.PHONY: shell-db
shell-db: ## 進入資料庫容器
	$(DOCKER_COMPOSE_DEV) exec postgres psql -U postgres -d knowledge_management

.PHONY: migrate
migrate: ## 執行資料庫遷移
	@echo "$(YELLOW)執行資料庫遷移...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec backend npx prisma migrate dev

.PHONY: migrate-reset
migrate-reset: ## 重置資料庫
	@echo "$(RED)重置資料庫...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec backend npx prisma migrate reset --force

.PHONY: seed
seed: ## 填充測試資料
	@echo "$(YELLOW)填充測試資料...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec backend npm run seed

.PHONY: studio
studio: ## 打開 Prisma Studio
	@echo "$(YELLOW)打開 Prisma Studio...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec backend npx prisma studio

.PHONY: test
test: ## 運行測試
	@echo "$(YELLOW)運行後端測試...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec backend npm test
	@echo "$(YELLOW)運行前端測試...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec frontend npm test

.PHONY: test-backend
test-backend: ## 運行後端測試
	$(DOCKER_COMPOSE_DEV) exec backend npm test

.PHONY: test-frontend
test-frontend: ## 運行前端測試
	$(DOCKER_COMPOSE_DEV) exec frontend npm test

.PHONY: lint
lint: ## 執行代碼檢查
	@echo "$(YELLOW)執行後端代碼檢查...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec backend npm run lint
	@echo "$(YELLOW)執行前端代碼檢查...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec frontend npm run lint

.PHONY: lint-fix
lint-fix: ## 修復代碼格式
	@echo "$(YELLOW)修復後端代碼格式...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec backend npm run lint:fix
	@echo "$(YELLOW)修復前端代碼格式...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec frontend npm run lint:fix

.PHONY: build
build: ## 構建生產版本
	@echo "$(YELLOW)構建後端...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec backend npm run build
	@echo "$(YELLOW)構建前端...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec frontend npm run build

.PHONY: clean
clean: ## 清理容器和鏡像
	@echo "$(YELLOW)清理容器...$(NC)"
	$(DOCKER_COMPOSE_DEV) down --rmi all --volumes --remove-orphans
	@echo "$(YELLOW)清理未使用的鏡像...$(NC)"
	docker system prune -f

.PHONY: backup-db
backup-db: ## 備份資料庫
	@echo "$(YELLOW)備份資料庫...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec postgres pg_dump -U postgres knowledge_management > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)資料庫備份完成！$(NC)"

.PHONY: restore-db
restore-db: ## 還原資料庫 (使用方法: make restore-db FILE=backup.sql)
	@echo "$(YELLOW)還原資料庫...$(NC)"
	@if [ -z "$(FILE)" ]; then echo "$(RED)錯誤: 請指定備份文件。使用方法: make restore-db FILE=backup.sql$(NC)"; exit 1; fi
	$(DOCKER_COMPOSE_DEV) exec -T postgres psql -U postgres knowledge_management < $(FILE)
	@echo "$(GREEN)資料庫還原完成！$(NC)"

.PHONY: health
health: ## 檢查服務健康狀態
	@echo "$(YELLOW)檢查服務健康狀態...$(NC)"
	@curl -f http://localhost:80/health || echo "$(RED)Frontend health check failed$(NC)"
	@curl -f http://localhost:3001/health || echo "$(RED)Backend health check failed$(NC)"

.PHONY: setup
setup: install ## 初始化項目
	@echo "$(YELLOW)初始化項目...$(NC)"
	@if [ ! -f .env ]; then cp .env.example .env; echo "$(GREEN)已創建 .env 文件，請編輯配置$(NC)"; fi
	@if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env; echo "$(GREEN)已創建 backend/.env 文件$(NC)"; fi
	@echo "$(GREEN)項目初始化完成！請編輯 .env 文件後執行 make dev$(NC)"

.PHONY: update
update: ## 更新依賴
	@echo "$(YELLOW)更新前端依賴...$(NC)"
	cd frontend && npm update
	@echo "$(YELLOW)更新後端依賴...$(NC)"
	cd backend && npm update
	@echo "$(YELLOW)更新爬蟲依賴...$(NC)"
	cd crawler && npm update
	@echo "$(GREEN)依賴更新完成！$(NC)"

.PHONY: security
security: ## 安全性檢查
	@echo "$(YELLOW)執行安全性檢查...$(NC)"
	cd backend && npm audit
	cd frontend && npm audit
	cd crawler && npm audit