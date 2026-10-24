import type { ValidationResult } from './validators.ts';

export type SystemDesignScenarioId =
  | 'url_shortener'
  | 'ride_hailing_matching'
  | 'flash_sale'
  | 'distributed_notification_system'
  | 'custom_system';

export type SystemDesignDifficulty = 'senior' | 'staff' | 'principal';

export type SystemDesignSessionStatus = 'draft' | 'in_progress' | 'evaluated' | 'archived';

export type DatabaseEngine =
  | 'postgresql'
  | 'mysql'
  | 'dynamodb'
  | 'cassandra'
  | 'mongodb'
  | 'redis'
  | 'clickhouse';

export type CachingStrategy =
  | 'cache_aside'
  | 'read_through'
  | 'write_through'
  | 'write_back'
  | 'none';

export type PartitionStrategy =
  | 'consistent_hashing'
  | 'range_based'
  | 'hash_mod'
  | 'geohash_spatial'
  | 'composite_key';

export type ConsistencyModel =
  | 'strong_linearizable'
  | 'eventual'
  | 'causal'
  | 'read_your_writes';

export type ApiProtocol = 'rest_json' | 'grpc_protobuf' | 'graphql' | 'websocket';

export type SeniorityVerdict =
  | 'Principal/Staff Ready'
  | 'Senior Ready'
  | 'Mid-Level Contender'
  | 'Needs Architecture Practice';

export interface SystemCapacityInputDTO {
  dailyActiveUsers: number;
  readsPerUserPerDay: number;
  writesPerUserPerDay: number;
  avgReadPayloadBytes: number;
  avgWritePayloadBytes: number;
  peakLoadMultiplier: number;
  dataRetentionYears: number;
  cacheWorkingSetPercentage: number;
}

export interface SystemCapacityEstimateDTO {
  totalDailyReads: number;
  totalDailyWrites: number;
  averageReadQps: number;
  averageWriteQps: number;
  totalAverageQps: number;
  peakReadQps: number;
  peakWriteQps: number;
  peakTotalQps: number;
  ingressBandwidthMbps: number;
  egressBandwidthMbps: number;
  dailyStorageBytes: number;
  annualStorageGb: number;
  retentionTotalStorageTb: number;
  cacheMemoryRequiredGb: number;
  recommendedAppServers: number;
  recommendedCacheNodes: number;
  recommendedDbShards: number;
}

export interface ScopeAndClarificationDTO {
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  outOfScope: string[];
  slaTargetUptime: string;
  latencyTargetP99Ms: number;
}

export interface ApiEndpointDefinitionDTO {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'WS';
  path: string;
  description: string;
  protocol: ApiProtocol;
}

export interface ArchitectureComponentDTO {
  name: string;
  type: 'gateway' | 'service' | 'cache' | 'database' | 'queue' | 'cdn' | 'worker';
  purpose: string;
}

export interface HighLevelDesignDTO {
  apiEndpoints: ApiEndpointDefinitionDTO[];
  coreComponents: ArchitectureComponentDTO[];
  mermaidDiagram: string;
  dataFlowSteps: string[];
}

export interface DatabaseTableDefinitionDTO {
  table: string;
  primaryKey: string;
  partitionKey?: string;
  columns: string[];
  indexes: string[];
}

export interface DeepDiveDesignDTO {
  databaseEngine: DatabaseEngine;
  databaseSchema: DatabaseTableDefinitionDTO[];
  cachingStrategy: CachingStrategy;
  cacheTtlSeconds: number;
  partitionStrategy: PartitionStrategy;
  consistencyModel: ConsistencyModel;
  concurrencyControl: string;
}

export interface ResilienceAndScaleDTO {
  singlePointsOfFailure: string[];
  rateLimitingStrategy: string;
  circuitBreakerPolicy: string;
  disasterRecoveryPlan: string;
  monitoringAndAlerting: string[];
}

export interface SystemDesignBlueprintDTO {
  scope: ScopeAndClarificationDTO;
  highLevelDesign: HighLevelDesignDTO;
  deepDive: DeepDiveDesignDTO;
  resilience: ResilienceAndScaleDTO;
}

export interface PillarEvaluationDTO {
  pillar:
    | 'scope_clarification'
    | 'high_level_design'
    | 'data_and_caching'
    | 'distributed_depth'
    | 'resilience_and_scale';
  name: string;
  score: number;
  weightPercentage: number;
  strengths: string[];
  gaps: string[];
  feedback: string;
}

export interface SystemDesignEvaluationDTO {
  id: string;
  sessionId: string;
  evaluatedAt: string;
  overallScore: number;
  seniorityVerdict: SeniorityVerdict;
  targetRole: string;
  pillars: PillarEvaluationDTO[];
  topStrengths: string[];
  criticalGaps: string[];
  tradeOffAnalysis: string;
  actionableRecommendations: string[];
}

export interface SystemDesignScenarioDTO {
  id: SystemDesignScenarioId;
  title: string;
  tagline: string;
  category: 'web_scale' | 'real_time_geo' | 'high_concurrency' | 'messaging';
  difficulty: SystemDesignDifficulty;
  problemStatement: string;
  scaleExpectations: string;
  defaultCapacityInput: SystemCapacityInputDTO;
  exemplarBlueprint: SystemDesignBlueprintDTO;
}

export interface SystemDesignSessionDTO {
  id: string;
  userId: string;
  title: string;
  scenarioId: SystemDesignScenarioId;
  targetRole: string;
  difficulty: SystemDesignDifficulty;
  capacityInput: SystemCapacityInputDTO;
  capacityEstimates: SystemCapacityEstimateDTO;
  blueprint: SystemDesignBlueprintDTO;
  status: SystemDesignSessionStatus;
  score?: number;
  latestEvaluation?: SystemDesignEvaluationDTO | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemDesignSessionMutationInputDTO {
  title: string;
  scenarioId: SystemDesignScenarioId;
  targetRole?: string;
  difficulty?: SystemDesignDifficulty;
  capacityInput?: SystemCapacityInputDTO;
  blueprint?: SystemDesignBlueprintDTO;
  status?: SystemDesignSessionStatus;
}

export const SYSTEM_DESIGN_SCENARIOS: SystemDesignScenarioDTO[] = [
  {
    id: 'url_shortener',
    title: 'URL Shortener (TinyURL / Bitly)',
    tagline: 'Kiến trúc chuyển hướng siêu tốc độ, Base62 tokenization và Key-Value cache quy mô 100M URLs/tháng',
    category: 'web_scale',
    difficulty: 'senior',
    problemStatement: 'Thiết kế dịch vụ rút gọn link cho 100 triệu người dùng hàng ngày. Hệ thống cần chuyển hướng link dài với độ trễ < 20ms, hỗ trợ custom alias, tự động hết hạn TTL và cung cấp thống kê click theo thời gian thực.',
    scaleExpectations: '100M DAU, 10 lượt click/user/ngày (1 tỷ lượt đọc/ngày), tỷ lệ đọc:ghi = 100:1. Cần 99.99% availability.',
    defaultCapacityInput: {
      dailyActiveUsers: 100000000,
      readsPerUserPerDay: 10,
      writesPerUserPerDay: 0.1,
      avgReadPayloadBytes: 256,
      avgWritePayloadBytes: 512,
      peakLoadMultiplier: 3,
      dataRetentionYears: 5,
      cacheWorkingSetPercentage: 20
    },
    exemplarBlueprint: {
      scope: {
        functionalRequirements: [
          'Tạo link rút gọn ngẫu nhiên dài 7 ký tự Base62 từ URL dài',
          'Cho phép người dùng chỉ định custom alias nếu chưa bị chiếm dụng',
          'Chuyển hướng người dùng qua HTTP 301 (Permanent) hoặc 302 (Found) trong < 20ms',
          'Xóa hoặc vô hiệu hóa link sau khoảng thời gian hết hạn (TTL)'
        ],
        nonFunctionalRequirements: [
          'Độ sẵn sàng cao (High Availability 99.99%)',
          'Độ trễ đọc P99 < 15ms tại Edge CDN/Cache',
          'Tỷ lệ đọc:ghi chênh lệch lớn (100:1 Read-Heavy)',
          'Link rút gọn không thể đoán trước (chống brute-force crawler)'
        ],
        outOfScope: [
          'Kiểm tra mã độc malware trong nội dung trang web đích',
          'Thanh toán gói premium người dùng cá nhân'
        ],
        slaTargetUptime: '99.99%',
        latencyTargetP99Ms: 20
      },
      highLevelDesign: {
        apiEndpoints: [
          {
            method: 'POST',
            path: '/api/v1/urls',
            description: 'Tạo link rút gọn mới từ URL gốc',
            protocol: 'rest_json'
          },
          {
            method: 'GET',
            path: '/:shortUrl',
            description: 'Redirect người dùng tới URL gốc tương ứng',
            protocol: 'rest_json'
          },
          {
            method: 'GET',
            path: '/api/v1/urls/:shortUrl/analytics',
            description: 'Lấy thống kê lượt click theo vị trí địa lý',
            protocol: 'rest_json'
          }
        ],
        coreComponents: [
          { name: 'Cloudflare Edge CDN', type: 'cdn', purpose: 'Phân phối DNS Anycast và cache các hot URL tại PoP' },
          { name: 'API Gateway (Envoy)', type: 'gateway', purpose: 'Rate limiting per IP, routing và TLS termination' },
          { name: 'Redirect Service', type: 'service', purpose: 'Xử lý truy vấn chuyển hướng HTTP 302 siêu nhẹ' },
          { name: 'Shortening Service', type: 'service', purpose: 'Xử lý logic băm, KGS và lưu trữ bản ghi URL' },
          { name: 'Key Generation Service (KGS)', type: 'worker', purpose: 'Sinh trước các khóa Base62 ngẫu nhiên vào memory buffer' },
          { name: 'Redis Cache Cluster', type: 'cache', purpose: 'Lưu trữ hot URL mapping theo quy tắc 80/20' },
          { name: 'NoSQL KV Database (Cassandra/DynamoDB)', type: 'database', purpose: 'Lưu trữ bền vững hàng tỷ bản ghi URL với partition key short_url' }
        ],
        mermaidDiagram: `graph TD
  User((Client Browser)) --> CDN[Cloudflare Edge Anycast]
  CDN --> Gateway[Envoy API Gateway]
  Gateway -->|Read Redirect| RedirectSvc[Redirect Service]
  Gateway -->|Create Short URL| ShortenSvc[Shortening Service]
  RedirectSvc --> Cache[(Redis Cache Cluster)]
  Cache -.->|Cache Miss| DB[(Cassandra DB Cluster)]
  ShortenSvc --> KGS[Key Generation Service]
  ShortenSvc --> DB
  ShortenSvc --> Cache
  RedirectSvc --> Kafka[Kafka Analytics Stream]
  Kafka --> SparkWorker[Flink/Spark Consumer]
  SparkWorker --> ClickHouse[(ClickHouse OLAP)]`,
        dataFlowSteps: [
          'Client gửi request HTTP GET /xyz đến Cloudflare Edge CDN',
          'CDN kiểm tra cache; nếu trúng trả về 301/302 ngay lập tức (< 5ms)',
          'Nếu miss, CDN chuyển tiếp tới Envoy Gateway -> Redirect Service',
          'Redirect Service truy vấn Redis Cache; nếu trúng trả về 302 và ghi log async sang Kafka',
          'Nếu miss, Redirect Service đọc Cassandra theo partition key, ghi lại vào Redis và trả về kết quả'
        ]
      },
      deepDive: {
        databaseEngine: 'dynamodb',
        databaseSchema: [
          {
            table: 'urls',
            primaryKey: 'short_url (String)',
            partitionKey: 'short_url',
            columns: ['short_url', 'original_url', 'user_id', 'created_at', 'expires_at', 'click_count'],
            indexes: ['idx_user_created (user_id, created_at DESC)']
          }
        ],
        cachingStrategy: 'cache_aside',
        cacheTtlSeconds: 86400,
        partitionStrategy: 'consistent_hashing',
        consistencyModel: 'eventual',
        concurrencyControl: 'Pre-generated KGS keys prevent race condition without database row locks'
      },
      resilience: {
        singlePointsOfFailure: [
          'KGS Memory exhaustion: Sử dụng dual-instance KGS nạp sẵn vào 2 memory rings độc lập',
          'Redis Cache Failure: Sentinel auto-failover, graceful degrade đọc trực tiếp Cassandra cluster'
        ],
        rateLimitingStrategy: 'Token bucket per IP (100 req/min cho create, 2000 req/min cho redirect)',
        circuitBreakerPolicy: 'Envoy circuit breaker mở khi tỷ lệ lỗi upstream > 15% trong 10s',
        disasterRecoveryPlan: 'Multi-region active-active Cassandra replication với RPO < 5s, RTO < 1m',
        monitoringAndAlerting: [
          'P99 Redirect Latency > 30ms (P1 Alert)',
          'Redis Memory Saturation > 80% (P2 Alert)',
          'Kafka Lag > 10,000 messages (P2 Alert)'
        ]
      }
    }
  },
  {
    id: 'flash_sale',
    title: 'Flash Sale High-Concurrency Engine (Shopee / Lazada)',
    tagline: 'Hệ thống mở bán chớp nhoáng chịu tải 200,000 peak QPS, chống overselling với Redis Lua token bucket và async order queue',
    category: 'high_concurrency',
    difficulty: 'principal',
    problemStatement: 'Xây dựng engine bán hàng flash sale cho sự kiện 11.11 với 1 triệu người dùng cùng lúc tranh mua 10,000 sản phẩm trong vòng 30 giây. Yêu cầu chống bán vượt tồn kho (overselling), đảm bảo công bằng (anti-bot) và bảo vệ cơ sở dữ liệu quan hệ phía sau khỏi sập tải.',
    scaleExpectations: '50M registered users, 500,000 active sessions tại thời điểm 00:00, 200,000 peak write QPS. Zero overselling.',
    defaultCapacityInput: {
      dailyActiveUsers: 50000000,
      readsPerUserPerDay: 40,
      writesPerUserPerDay: 2,
      avgReadPayloadBytes: 2048,
      avgWritePayloadBytes: 1024,
      peakLoadMultiplier: 8,
      dataRetentionYears: 3,
      cacheWorkingSetPercentage: 15
    },
    exemplarBlueprint: {
      scope: {
        functionalRequirements: [
          'Hiển thị trang chi tiết flash sale với đồng hồ đếm ngược và số lượng còn lại',
          'Khóa tạm thời số lượng tồn kho (pre-deduct inventory) khi người dùng bấm đặt hàng',
          'Sinh đơn hàng chờ thanh toán trong vòng 15 phút',
          'Hủy đơn và hoàn tồn kho nếu quá 15 phút chưa thanh toán thành công'
        ],
        nonFunctionalRequirements: [
          'Tuyệt đối không bán âm tồn kho (Strict Zero Overselling Guarantee)',
          'Chịu tải đỉnh 200,000 QPS tại giây mở bán mà không sập hệ thống',
          'Độ trễ phản hồi xếp hàng đặt hàng < 100ms',
          'Chống gian lận bot, multi-account và race conditions'
        ],
        outOfScope: [
          'Giao dịch thanh toán quốc tế thẻ tín dụng (Ủy quyền cho Payment Gateway)',
          'Vận chuyển kho bãi logistics sau khi đơn thành công'
        ],
        slaTargetUptime: '99.999%',
        latencyTargetP99Ms: 80
      },
      highLevelDesign: {
        apiEndpoints: [
          {
            method: 'GET',
            path: '/api/v1/flash-sale/:id/status',
            description: 'Kiểm tra trạng thái mở bán và tồn kho khả dụng',
            protocol: 'rest_json'
          },
          {
            method: 'POST',
            path: '/api/v1/flash-sale/:id/purchase',
            description: 'Thực hiện tranh mua sản phẩm flash sale với idempotency token',
            protocol: 'rest_json'
          },
          {
            method: 'WS',
            path: '/ws/v1/flash-sale/:id/realtime',
            description: 'Kênh WebSocket cập nhật số lượng hàng và kết quả xếp hàng đơn',
            protocol: 'websocket'
          }
        ],
        coreComponents: [
          { name: 'WAF & Bot Defender', type: 'gateway', purpose: 'Lọc bot, captcha xác thực và rate-limit theo thiết bị/fingerprint' },
          { name: 'Flash Sale Order Service', type: 'service', purpose: 'Tiếp nhận yêu cầu mua và chạy script Lua trừ kho nguyên tử' },
          { name: 'Redis Cluster (In-Memory Inventory)', type: 'cache', purpose: 'Lưu trữ token tồn kho và thực hiện Atomic Decrement via Lua' },
          { name: 'Kafka Order Topic', type: 'queue', purpose: 'Bộ đệm bất đồng bộ san phẳng đỉnh tải (traffic leveling)' },
          { name: 'Order Persistence Worker', type: 'worker', purpose: 'Tiêu thụ message từ Kafka để ghi đơn hàng vào PostgreSQL' },
          { name: 'Transactional PostgreSQL DB', type: 'database', purpose: 'Lưu trữ đơn hàng chính thức với ACID transaction' }
        ],
        mermaidDiagram: `graph TD
  User((Shopper App)) --> WAF[Cloud WAF & Bot Mitigation]
  WAF --> APIGW[Kong API Gateway]
  APIGW --> PreOrderSvc[Pre-Order Gateway Service]
  PreOrderSvc --> RedisCluster[(Redis Cluster - Lua Inventory)]
  RedisCluster -->|Trừ kho thành công| KafkaQ[Kafka Order Message Queue]
  RedisCluster -->|Hết kho| Reject[Trả về: Hết hàng]
  KafkaQ --> OrderWorker[Order Creation Workers]
  OrderWorker --> OrderDB[(PostgreSQL Primary Master)]
  OrderWorker --> DelayQueue[Delayed Queue 15m Payment TTL]
  DelayQueue --> RollbackWorker[Inventory Rollback Worker]
  RollbackWorker -.->|Hoàn kho nếu chưa trả tiền| RedisCluster`,
        dataFlowSteps: [
          'Người dùng click nút "Mua ngay", client đính kèm Idempotency-Key và User-Token',
          'WAF kiểm tra chữ ký token và chống bot replay',
          'Pre-Order Gateway gọi script Redis Lua: kiểm tra user_purchased_set và trừ stock atomically',
          'Nếu stock > 0: script đẩy thông tin vào Kafka Queue, trả về 202 Accepted cho client trong < 30ms',
          'Nếu stock <= 0: trả về ngay lập tức 410 Sold Out',
          'Order Worker kéo message từ Kafka, mở transaction SQL tạo đơn hàng trong PostgreSQL',
          'Hệ thống gửi thông báo WebSocket về trạng thái sẵn sàng thanh toán cho client'
        ]
      },
      deepDive: {
        databaseEngine: 'postgresql',
        databaseSchema: [
          {
            table: 'flash_sale_items',
            primaryKey: 'item_id (UUID)',
            columns: ['item_id', 'title', 'total_stock', 'reserved_stock', 'sale_price', 'start_time', 'end_time'],
            indexes: ['idx_sale_time (start_time, end_time)']
          },
          {
            table: 'orders',
            primaryKey: 'order_id (UUID)',
            columns: ['order_id', 'user_id', 'item_id', 'status', 'amount', 'expires_at', 'created_at'],
            indexes: ['idx_user_orders (user_id, created_at DESC)', 'idx_order_status_expiry (status, expires_at)']
          }
        ],
        cachingStrategy: 'write_back',
        cacheTtlSeconds: 3600,
        partitionStrategy: 'hash_mod',
        consistencyModel: 'strong_linearizable',
        concurrencyControl: 'Redis Lua Script executes single-threaded atomic check-and-decrement preventing any oversell'
      },
      resilience: {
        singlePointsOfFailure: [
          'Redis Master failure: Sử dụng Redis Sentinel với auto failover trong 3 giây và replication factor 3',
          'Kafka Partition Slowdown: Scale partition theo hash(item_id, user_id) với 64 partitions'
        ],
        rateLimitingStrategy: 'Leaky bucket per User ID (1 request/s), Token bucket per IP (30 request/s)',
        circuitBreakerPolicy: 'Nếu Kafka bị nghẽn (Queue Lag > 50,000), bật chế độ Degradation từ chối nhận đơn mới',
        disasterRecoveryPlan: 'Daily automated snapshot DB kết hợp WAL archiving liên tục lên S3',
        monitoringAndAlerting: [
          'Redis Lua execution latency > 10ms',
          'Postgres Active Connection Pool > 85%',
          'Oversell count != 0 (Fatal P0 Alert)'
        ]
      }
    }
  },
  {
    id: 'ride_hailing_matching',
    title: 'Real-Time Ride Matching & Telemetry (Grab / Uber)',
    tagline: 'Hệ thống định vị GPS không gian QuadTree/H3, WebSocket streaming và khớp chuyến theo thời gian thực',
    category: 'real_time_geo',
    difficulty: 'staff',
    problemStatement: 'Thiết kế hệ thống định vị tài xế và ghép cuốc xe thời gian thực cho 5 triệu tài xế cập nhật GPS mỗi 4 giây. Ghép nối hành khách với tài xế gần nhất trong bán kính 3km với độ trễ phản hồi < 1 giây.',
    scaleExpectations: '5M active drivers, telemetry update 4s/lần (~1.25M updates/giây), 500,000 matching requests/phút.',
    defaultCapacityInput: {
      dailyActiveUsers: 30000000,
      readsPerUserPerDay: 50,
      writesPerUserPerDay: 15,
      avgReadPayloadBytes: 1024,
      avgWritePayloadBytes: 256,
      peakLoadMultiplier: 4,
      dataRetentionYears: 2,
      cacheWorkingSetPercentage: 10
    },
    exemplarBlueprint: {
      scope: {
        functionalRequirements: [
          'Thu nhận vị trí GPS thời gian thực từ ứng dụng tài xế định kỳ mỗi 4 giây',
          'Hành khách xem vị trí các tài xế gần nhất trên bản đồ',
          'Ghép chuyến thông minh theo khoảng cách, thời gian đón ước tính (ETA) và độ ưu đãi',
          'Khóa trạng thái tài xế khi nhận cuốc tránh bị ghép trùng lặp'
        ],
        nonFunctionalRequirements: [
          'Độ trễ cập nhật vị trí trên bản đồ hành khách < 2 giây',
          'Xử lý 1.25 triệu GPS telemetry updates mỗi giây',
          'Tính nhất quán cao trong quá trình Dispatch tránh 2 khách cùng ghép 1 tài xế',
          'Khả năng phục hồi cao theo từng khu vực địa lý (Geographic Isolation)'
        ],
        outOfScope: [
          'Tính toán định tuyến bản đồ chi tiết từng khúc cua (Tích hợp Map Provider)',
          'Thuế và báo cáo tài chính tài xế'
        ],
        slaTargetUptime: '99.99%',
        latencyTargetP99Ms: 150
      },
      highLevelDesign: {
        apiEndpoints: [
          {
            method: 'WS',
            path: '/ws/v1/drivers/telemetry',
            description: 'WebSocket stream liên tục truyền tọa độ lat/lng và hướng di chuyển',
            protocol: 'websocket'
          },
          {
            method: 'POST',
            path: '/api/v1/rides/request',
            description: 'Yêu cầu đặt chuyến mới từ hành khách kèm điểm đón và điểm đến',
            protocol: 'rest_json'
          },
          {
            method: 'GET',
            path: '/api/v1/drivers/nearby',
            description: 'Lấy danh sách các tài xế khả dụng xung quanh vị trí hiện tại',
            protocol: 'rest_json'
          }
        ],
        coreComponents: [
          { name: 'WebSocket Gateway Cluster', type: 'gateway', purpose: 'Duy trì hàng triệu kết nối song song với tài xế và nhận tọa độ GPS' },
          { name: 'Spatial Index Engine (Uber H3 / QuadTree)', type: 'cache', purpose: 'Phân mảnh không gian theo lưới lục giác H3 cấp 8 để index tài xế' },
          { name: 'Redis Geospatial Cluster', type: 'cache', purpose: 'Lưu trữ tọa độ thời gian thực với TTL 10 giây' },
          { name: 'Dispatch & Matching Engine', type: 'service', purpose: 'Chạy thuật toán tìm k-nearest drivers và gửi lời mời cuốc xe' },
          { name: 'Distributed Lock (Redlock)', type: 'cache', purpose: 'Khóa trạng thái tài xế trong 15 giây khi gửi cuốc xe' },
          { name: 'Trip History Database (PostgreSQL + TimescaleDB)', type: 'database', purpose: 'Lưu trữ lịch sử chuyến đi và vệt đường GPS phục vụ khiếu nại' }
        ],
        mermaidDiagram: `graph TD
  Driver((Driver App)) -->|WebSocket 4s| WSGateway[WS Gateway Netty Cluster]
  WSGateway --> KafkaGeo[Kafka Telemetry Stream]
  KafkaGeo --> H3Indexer[Spatial H3 Indexer]
  H3Indexer --> RedisGeo[(Redis Geo H3 Clusters)]
  Passenger((Passenger App)) --> APIGateway[API Gateway]
  APIGateway --> MatchEngine[Dispatch & Matching Engine]
  MatchEngine --> RedisGeo
  MatchEngine -->|Acquire Lock| Redlock[(Redlock Distributed Lock)]
  MatchEngine --> TripDB[(PostgreSQL Trip DB)]`,
        dataFlowSteps: [
          'App tài xế đẩy {driver_id, lat, lng, bearing, status} qua WebSocket mỗi 4 giây',
          'WS Gateway nhận gói tin và ghi vào Kafka partition theo H3 Resolution 6',
          'H3 Indexer cập nhật vào Redis GEO set theo cell index',
          'Khách gửi request tìm xe: Match Engine đọc danh sách tài xế trong 7 cell H3 liền kề',
          'Match Engine lấy distributed lock trên driver_id hàng đầu và gửi thông báo mời nhận cuốc qua WebSocket'
        ]
      },
      deepDive: {
        databaseEngine: 'postgresql',
        databaseSchema: [
          {
            table: 'trips',
            primaryKey: 'trip_id (UUID)',
            partitionKey: 'created_at (Range per Month)',
            columns: ['trip_id', 'passenger_id', 'driver_id', 'pickup_h3', 'dropoff_h3', 'status', 'fare_vnd', 'created_at'],
            indexes: ['idx_passenger_trips (passenger_id, created_at DESC)', 'idx_driver_trips (driver_id, created_at DESC)']
          }
        ],
        cachingStrategy: 'read_through',
        cacheTtlSeconds: 15,
        partitionStrategy: 'geohash_spatial',
        consistencyModel: 'strong_linearizable',
        concurrencyControl: 'Redlock with 15s TTL prevents double-booking of active drivers during dispatch'
      },
      resilience: {
        singlePointsOfFailure: [
          'Redis Cell Crash: Các cell lân cận tự bù đắp (fallback radius search)',
          'WS Gateway node sập: Client tự động reconnect tới node khả dụng qua DNS Round-Robin'
        ],
        rateLimitingStrategy: 'Token bucket per driver (1 GPS ping/3s), per passenger (5 ride requests/min)',
        circuitBreakerPolicy: 'Nếu Redis Geo phản hồi > 300ms, tự động thu hẹp bán kính tìm kiếm từ 5km xuống 2km',
        disasterRecoveryPlan: 'Triển khai đa cụm Kubernetes theo khu vực địa lý (HN cluster, HCM cluster độc lập)',
        monitoringAndAlerting: [
          'Dispatch match success rate < 85% trong 5 phút (P1 Alert)',
          'Driver GPS telemetry drop rate > 5% (P2 Alert)'
        ]
      }
    }
  },
  {
    id: 'distributed_notification_system',
    title: 'Distributed Notification System (Apple APNs / Twilio Multi-Channel)',
    tagline: 'Kiến trúc gửi thông báo đa kênh quy mô 100 triệu message/ngày, phân tầng ưu tiên và Dead Letter Queue',
    category: 'messaging',
    difficulty: 'senior',
    problemStatement: 'Thiết kế nền tảng thông báo đa kênh tập trung cho doanh nghiệp hỗ trợ Mobile Push, SMS, Email và In-App Notification. Đảm bảo chuyển phát tin tức thời cho mã OTP trong < 3 giây, hỗ trợ deduplication, kiểm soát tần suất gửi (rate-limit) và tự động thử lại khi nhà mạng lỗi.',
    scaleExpectations: '100M notifications/ngày, tỷ lệ đỉnh 10,000 notifications/giây, hỗ trợ 4 kênh phát hành độc lập.',
    defaultCapacityInput: {
      dailyActiveUsers: 20000000,
      readsPerUserPerDay: 5,
      writesPerUserPerDay: 5,
      avgReadPayloadBytes: 512,
      avgWritePayloadBytes: 1024,
      peakLoadMultiplier: 3,
      dataRetentionYears: 1,
      cacheWorkingSetPercentage: 10
    },
    exemplarBlueprint: {
      scope: {
        functionalRequirements: [
          'Hỗ trợ gửi thông báo đa kênh: Push (FCM/APNs), SMS (Twilio), Email (SendGrid), In-App',
          'Phân tầng mức độ ưu tiên: High Priority (Mã OTP, Cảnh báo giao dịch), Normal (Marketing, Bản tin)',
          'Loại trừ trùng lặp tin nhắn trong vòng 10 phút (Deduplication via Hash)',
          'Quản lý tùy chọn nhận thông báo của người dùng (User Notification Preferences)'
        ],
        nonFunctionalRequirements: [
          'Độ trễ chuyển phát OTP P99 < 3 giây từ lúc gọi API',
          'Đảm bảo không bao giờ làm thất thoát thông báo (At-least-once delivery with DLQ)',
          'Khả năng scale độc lập từng kênh gửi mà không ảnh hưởng kênh khác',
          'Bảo mật thông tin nhạy cảm trong nội dung thông báo'
        ],
        outOfScope: [
          'Soạn thảo nội dung tiếp thị WYSIWYG Marketing Editor',
          'Quản lý danh bạ CRM tổng thể của công ty'
        ],
        slaTargetUptime: '99.99%',
        latencyTargetP99Ms: 200
      },
      highLevelDesign: {
        apiEndpoints: [
          {
            method: 'POST',
            path: '/api/v1/notifications/send',
            description: 'Gửi yêu cầu thông báo mới với priority và channel tags',
            protocol: 'rest_json'
          },
          {
            method: 'GET',
            path: '/api/v1/users/:id/in-app',
            description: 'Lấy danh sách thông báo in-app chưa đọc của người dùng',
            protocol: 'rest_json'
          }
        ],
        coreComponents: [
          { name: 'Notification Ingest API', type: 'service', purpose: 'Validate payload, kiểm tra deduplication và gắn priority tag' },
          { name: 'Priority Kafka Queues', type: 'queue', purpose: 'Phân tách hàng đợi high-priority (OTP) và low-priority (Bulk marketing)' },
          { name: 'Deduplication Cache (Redis)', type: 'cache', purpose: 'Kiểm tra idempotent hash trong vòng 600 giây' },
          { name: 'Channel Dispatch Workers', type: 'worker', purpose: 'Các worker chuyên biệt cho từng cổng: APNs, FCM, Twilio, SendGrid' },
          { name: 'Dead Letter Queue (DLQ)', type: 'queue', purpose: 'Lưu trữ các tin nhắn gửi thất bại sau 5 lần retry để phân tích' },
          { name: 'Notification History DB (MongoDB/Postgres)', type: 'database', purpose: 'Lưu trữ trạng thái gửi (sent, delivered, opened, failed)' }
        ],
        mermaidDiagram: `graph TD
  SenderSvc[Client Business Services] --> IngestAPI[Notification Ingest API]
  IngestAPI --> RedisDedupe[(Redis Deduplication)]
  IngestAPI --> KafkaHigh[Kafka High-Priority Topic - OTP]
  IngestAPI --> KafkaBulk[Kafka Bulk Topic - Promo]
  KafkaHigh --> WorkerOTP[Fast Dispatch Workers]
  KafkaBulk --> WorkerBulk[Throttled Dispatch Workers]
  WorkerOTP --> APNs[Apple APNs / Google FCM]
  WorkerOTP --> SMS[Twilio / VNPT SMS]
  WorkerBulk --> Email[SendGrid Email]
  WorkerOTP -.->|Retry Failed| DLQ[Dead Letter Queue]
  WorkerOTP --> MongoHistory[(Notification Log DB)]`,
        dataFlowSteps: [
          'Service nội bộ gọi POST /api/v1/notifications/send kèm Idempotency-Key',
          'Ingest API kiểm tra Redis: nếu key đã tồn tại thì bỏ qua (deduplicated)',
          'Ingest API đọc User Preference từ Cache; nếu user tắt kênh thì dừng',
          'Tin nhắn được đẩy vào Kafka Topic tương ứng (High hoặc Bulk)',
          'Worker chuyên biệt kéo tin nhắn, gọi 3rd Party Provider với timeout 2.5s',
          'Nếu 3rd party lỗi tạm thời: retry backoff lũy thừa tối đa 3 lần',
          'Nếu vẫn lỗi: chuyển sang kênh SMS fallback hoặc đưa vào Dead Letter Queue'
        ]
      },
      deepDive: {
        databaseEngine: 'mongodb',
        databaseSchema: [
          {
            table: 'notifications',
            primaryKey: 'notification_id (ObjectId)',
            partitionKey: 'recipient_user_id',
            columns: ['notification_id', 'recipient_user_id', 'channel', 'priority', 'status', 'retry_count', 'created_at'],
            indexes: ['idx_user_status (recipient_user_id, status, created_at DESC)']
          }
        ],
        cachingStrategy: 'cache_aside',
        cacheTtlSeconds: 600,
        partitionStrategy: 'consistent_hashing',
        consistencyModel: 'eventual',
        concurrencyControl: 'Redis SetNX with 10m TTL provides idempotent delivery guarantee'
      },
      resilience: {
        singlePointsOfFailure: [
          'Twilio SMS Gateway outage: Cấu hình multi-vendor fallback (Twilio -> Infobip -> VNPT SMS)',
          'Kafka broker fail: RF=3, min.insync.replicas=2 đảm bảo không mất thông báo'
        ],
        rateLimitingStrategy: 'Token bucket 5 SMS/user/hour, 50 Push/user/day',
        circuitBreakerPolicy: 'Nếu SendGrid phản hồi 5xx liên tiếp trong 30s, tạm ngưng 60s và chuyển sang hàng đợi trễ',
        disasterRecoveryPlan: 'Active-passive queue cross-region replication với tự động chuyển hướng webhook',
        monitoringAndAlerting: [
          'OTP Delivery Latency P95 > 5 giây (P0 Alert)',
          'DLQ Rate > 1% tổng lưu lượng (P1 Alert)'
        ]
      }
    }
  },
  {
    id: 'custom_system',
    title: 'Custom System Whiteboard (Blank Canvas Studio)',
    tagline: 'Môi trường kiến trúc tự do: thiết kế bất kỳ hệ thống phân tán nào theo tiêu chuẩn phỏng vấn FAANG',
    category: 'web_scale',
    difficulty: 'senior',
    problemStatement: 'Tự do định nghĩa bài toán kiến trúc hệ thống của bạn (Streaming Video, Collaborative Editor, E-Commerce Cart, IoT Telemetry Hub...).',
    scaleExpectations: 'Tùy biến theo bài toán của ứng viên.',
    defaultCapacityInput: {
      dailyActiveUsers: 10000000,
      readsPerUserPerDay: 20,
      writesPerUserPerDay: 2,
      avgReadPayloadBytes: 1024,
      avgWritePayloadBytes: 512,
      peakLoadMultiplier: 3,
      dataRetentionYears: 3,
      cacheWorkingSetPercentage: 20
    },
    exemplarBlueprint: {
      scope: {
        functionalRequirements: [
          'Định nghĩa các ca sử dụng người dùng chính',
          'Định nghĩa các luồng xử lý dữ liệu lõi',
          'Xác lập phạm vi tính năng trong và ngoài phiên bản đầu'
        ],
        nonFunctionalRequirements: [
          'Độ sẵn sàng (High Availability)',
          'Độ trễ phản hồi (P99 Latency)',
          'Tính nhất quán dữ liệu (Consistency)',
          'Khả năng mở rộng ngang (Horizontal Scalability)'
        ],
        outOfScope: [
          'Các tính năng phụ trợ không cốt lõi'
        ],
        slaTargetUptime: '99.99%',
        latencyTargetP99Ms: 100
      },
      highLevelDesign: {
        apiEndpoints: [
          {
            method: 'GET',
            path: '/api/v1/resources',
            description: 'Lấy dữ liệu tài nguyên chính',
            protocol: 'rest_json'
          },
          {
            method: 'POST',
            path: '/api/v1/resources',
            description: 'Tạo mới hoặc sửa đổi tài nguyên',
            protocol: 'rest_json'
          }
        ],
        coreComponents: [
          { name: 'API Gateway', type: 'gateway', purpose: 'Điều phối luồng và bảo vệ hệ thống' },
          { name: 'Core Microservice', type: 'service', purpose: 'Thực thi logic nghiệp vụ trung tâm' },
          { name: 'Distributed Cache', type: 'cache', purpose: 'Giảm tải đọc và tăng tốc truy vấn' },
          { name: 'Persistent Database', type: 'database', purpose: 'Lưu trữ dữ liệu bền vững' }
        ],
        mermaidDiagram: `graph TD
  Client((Client App)) --> Gateway[API Gateway]
  Gateway --> Service[Core Microservice]
  Service --> Cache[(Redis Cache)]
  Service --> DB[(Persistent Database)]`,
        dataFlowSteps: [
          'Client gửi yêu cầu qua API Gateway',
          'Gateway xác thực và chuyển tiếp tới Core Microservice',
          'Service kiểm tra Cache trước khi truy vấn Database',
          'Kết quả được trả về client và lưu đệm vào Cache'
        ]
      },
      deepDive: {
        databaseEngine: 'postgresql',
        databaseSchema: [
          {
            table: 'resources',
            primaryKey: 'id (UUID)',
            columns: ['id', 'user_id', 'data', 'created_at'],
            indexes: ['idx_user (user_id)']
          }
        ],
        cachingStrategy: 'cache_aside',
        cacheTtlSeconds: 3600,
        partitionStrategy: 'consistent_hashing',
        consistencyModel: 'eventual',
        concurrencyControl: 'Optimistic concurrency control with version column'
      },
      resilience: {
        singlePointsOfFailure: [
          'Database Primary failure: Triển khai Master-Replica với auto failover'
        ],
        rateLimitingStrategy: 'Token bucket per User ID',
        circuitBreakerPolicy: 'Ngắt mạch khi tỷ lệ lỗi downstream > 20%',
        disasterRecoveryPlan: 'Sao lưu định kỳ hàng ngày và phục hồi cross-region',
        monitoringAndAlerting: [
          'P99 Latency > 200ms',
          '5xx Error Rate > 1%'
        ]
      }
    }
  }
];

export function calculateCapacityEstimates(input: SystemCapacityInputDTO): SystemCapacityEstimateDTO {
  const dau = Math.max(1, input.dailyActiveUsers);
  const readsPerUser = Math.max(0, input.readsPerUserPerDay);
  const writesPerUser = Math.max(0, input.writesPerUserPerDay);
  const readSize = Math.max(1, input.avgReadPayloadBytes);
  const writeSize = Math.max(1, input.avgWritePayloadBytes);
  const peakMultiplier = Math.max(1, input.peakLoadMultiplier);
  const retentionYears = Math.max(0.1, input.dataRetentionYears);
  const cacheWorkingSetPct = Math.max(1, Math.min(100, input.cacheWorkingSetPercentage));

  const totalDailyReads = dau * readsPerUser;
  const totalDailyWrites = dau * writesPerUser;

  const averageReadQps = Math.round(totalDailyReads / 86400);
  const averageWriteQps = Math.round(totalDailyWrites / 86400);
  const totalAverageQps = averageReadQps + averageWriteQps;

  const peakReadQps = Math.round(averageReadQps * peakMultiplier);
  const peakWriteQps = Math.round(averageWriteQps * peakMultiplier);
  const peakTotalQps = Math.round(totalAverageQps * peakMultiplier);

  const ingressBandwidthMbps = Number(((averageWriteQps * writeSize * 8) / 1000000).toFixed(2));
  const egressBandwidthMbps = Number(((averageReadQps * readSize * 8) / 1000000).toFixed(2));

  const dailyStorageBytes = totalDailyWrites * writeSize;
  const annualStorageGb = Number(((dailyStorageBytes * 365) / (1024 * 1024 * 1024)).toFixed(2));
  const retentionTotalStorageTb = Number(((annualStorageGb * retentionYears) / 1024).toFixed(2));

  const cacheWorkingBytes = totalDailyReads * readSize * (cacheWorkingSetPct / 100);
  const cacheMemoryRequiredGb = Number((cacheWorkingBytes / (1024 * 1024 * 1024)).toFixed(2));

  const recommendedAppServers = Math.max(2, Math.ceil(peakTotalQps / 2000));
  const recommendedCacheNodes = Math.max(2, Math.ceil(cacheMemoryRequiredGb / 32));
  const recommendedDbShards = Math.max(1, Math.ceil(retentionTotalStorageTb / 4));

  return {
    totalDailyReads,
    totalDailyWrites,
    averageReadQps,
    averageWriteQps,
    totalAverageQps,
    peakReadQps,
    peakWriteQps,
    peakTotalQps,
    ingressBandwidthMbps,
    egressBandwidthMbps,
    dailyStorageBytes,
    annualStorageGb,
    retentionTotalStorageTb,
    cacheMemoryRequiredGb,
    recommendedAppServers,
    recommendedCacheNodes,
    recommendedDbShards
  };
}

export function evaluateSystemArchitecture(
  blueprint: SystemDesignBlueprintDTO,
  scenarioId: SystemDesignScenarioId,
  targetRole = 'Senior Software Engineer'
): SystemDesignEvaluationDTO {
  const pillars: PillarEvaluationDTO[] = [];

  let p1Score = 50;
  const p1Strengths: string[] = [];
  const p1Gaps: string[] = [];
  if (blueprint.scope.functionalRequirements.length >= 3) {
    p1Score += 20;
    p1Strengths.push('Yêu cầu chức năng đầy đủ và phân tách rõ ràng');
  } else {
    p1Gaps.push('Thiếu các yêu cầu chức năng tối thiểu (cần >= 3 mục)');
  }
  if (blueprint.scope.nonFunctionalRequirements.length >= 3) {
    p1Score += 15;
    p1Strengths.push('Xác định rõ ràng các thuộc tính phi chức năng (Availability, Latency, Scale)');
  } else {
    p1Gaps.push('Chưa làm rõ các tiêu chí phi chức năng quan trọng');
  }
  if (blueprint.scope.latencyTargetP99Ms > 0 && blueprint.scope.latencyTargetP99Ms <= 200) {
    p1Score += 15;
    p1Strengths.push(`SLA Latency P99 tham vọng và đo lường được: ${blueprint.scope.latencyTargetP99Ms}ms`);
  }
  p1Score = Math.min(100, p1Score);
  pillars.push({
    pillar: 'scope_clarification',
    name: 'Phạm vi & Làm rõ Yêu cầu (Scope & SLA)',
    score: p1Score,
    weightPercentage: 20,
    strengths: p1Strengths,
    gaps: p1Gaps,
    feedback: p1Score >= 80 ? 'Khả năng scoping xuất sắc theo chuẩn FAANG' : 'Cần làm rõ ràng hơn SLA/SLO và biên giới hệ thống'
  });

  let p2Score = 45;
  const p2Strengths: string[] = [];
  const p2Gaps: string[] = [];
  if (blueprint.highLevelDesign.apiEndpoints.length >= 2) {
    p2Score += 25;
    p2Strengths.push('Thiết kế API endpoints chuẩn REST/gRPC với path rõ ràng');
  } else {
    p2Gaps.push('Thiếu định nghĩa hợp đồng API tối thiểu');
  }
  if (blueprint.highLevelDesign.coreComponents.length >= 3) {
    p2Score += 15;
    p2Strengths.push('Kiến trúc phân tách các service độc lập và có gateway/cache');
  }
  if (blueprint.highLevelDesign.mermaidDiagram.trim().length > 30) {
    p2Score += 15;
    p2Strengths.push('Có sơ đồ luồng dữ liệu kiến trúc Mermaid trực quan');
  } else {
    p2Gaps.push('Thiếu sơ đồ kiến trúc topology');
  }
  p2Score = Math.min(100, p2Score);
  pillars.push({
    pillar: 'high_level_design',
    name: 'Kiến trúc Cấp cao & Hợp đồng API (HLD)',
    score: p2Score,
    weightPercentage: 20,
    strengths: p2Strengths,
    gaps: p2Gaps,
    feedback: p2Score >= 80 ? 'Thiết kế high-level sạch, phân rã trách nhiệm chuẩn xác' : 'Cần bổ sung chi tiết API contracts và luồng gọi dữ liệu'
  });

  let p3Score = 40;
  const p3Strengths: string[] = [];
  const p3Gaps: string[] = [];
  if (blueprint.deepDive.databaseSchema.length >= 1) {
    p3Score += 25;
    p3Strengths.push(`Thiết kế schema bảng với Primary Key và Index cho ${blueprint.deepDive.databaseEngine}`);
  } else {
    p3Gaps.push('Chưa mô tả cấu trúc database schema và index');
  }
  if (blueprint.deepDive.cachingStrategy !== 'none') {
    p3Score += 20;
    p3Strengths.push(`Áp dụng chiến lược caching ${blueprint.deepDive.cachingStrategy} (TTL: ${blueprint.deepDive.cacheTtlSeconds}s)`);
  } else {
    p3Gaps.push('Chưa thiết lập lớp đệm caching giảm tải cho database');
  }
  if (blueprint.deepDive.partitionStrategy !== 'composite_key') {
    p3Score += 15;
    p3Strengths.push(`Chiến lược phân vùng sharding ${blueprint.deepDive.partitionStrategy} phù hợp với scale lớn`);
  }
  p3Score = Math.min(100, p3Score);
  pillars.push({
    pillar: 'data_and_caching',
    name: 'Lưu trữ Dữ liệu & Caching (Data Layer)',
    score: p3Score,
    weightPercentage: 25,
    strengths: p3Strengths,
    gaps: p3Gaps,
    feedback: p3Score >= 80 ? 'Mô hình dữ liệu vững chắc, chiến lược cache sắc bén' : 'Cần tính toán kỹ chiến lược sharding key và cache eviction'
  });

  let p4Score = 40;
  const p4Strengths: string[] = [];
  const p4Gaps: string[] = [];
  if (blueprint.deepDive.concurrencyControl && blueprint.deepDive.concurrencyControl.length > 15) {
    p4Score += 30;
    p4Strengths.push(`Cơ chế kiểm soát tranh chấp (concurrency) chặt chẽ: ${blueprint.deepDive.concurrencyControl}`);
  } else {
    p4Gaps.push('Chưa làm rõ cơ chế distributed lock hoặc optimistic concurrency');
  }
  if (blueprint.deepDive.consistencyModel) {
    p4Score += 30;
    p4Strengths.push(`Lựa chọn mô hình tính nhất quán ${blueprint.deepDive.consistencyModel} phù hợp định lý CAP`);
  }
  p4Score = Math.min(100, p4Score);
  pillars.push({
    pillar: 'distributed_depth',
    name: 'Độ sâu Hệ phân tán & Đánh đổi (Distributed Depth)',
    score: p4Score,
    weightPercentage: 20,
    strengths: p4Strengths,
    gaps: p4Gaps,
    feedback: p4Score >= 80 ? 'Tư duy Staff/Principal: phân tích trade-offs và race condition thấu đáo' : 'Cần đào sâu hơn về tính nhất quán và xử lý tranh chấp song song'
  });

  let p5Score = 35;
  const p5Strengths: string[] = [];
  const p5Gaps: string[] = [];
  if (blueprint.resilience.singlePointsOfFailure.length >= 1) {
    p5Score += 25;
    p5Strengths.push('Nhận diện chính xác các điểm nghẽn đơn độc (SPOF) và phương án dự phòng');
  } else {
    p5Gaps.push('Chưa phân tích SPOF');
  }
  if (blueprint.resilience.rateLimitingStrategy.length > 10) {
    p5Score += 20;
    p5Strengths.push(`Bảo vệ hệ thống bằng Rate Limiting: ${blueprint.resilience.rateLimitingStrategy}`);
  } else {
    p5Gaps.push('Thiếu cơ chế Rate Limiting chống DDoS và lạm dụng API');
  }
  if (blueprint.resilience.circuitBreakerPolicy.length > 10) {
    p5Score += 20;
    p5Strengths.push('Thiết lập Circuit Breaker ngăn chặn cascading failure');
  }
  p5Score = Math.min(100, p5Score);
  pillars.push({
    pillar: 'resilience_and_scale',
    name: 'Chống lỗi & Khả năng Vận hành (Resilience & Ops)',
    score: p5Score,
    weightPercentage: 15,
    strengths: p5Strengths,
    gaps: p5Gaps,
    feedback: p5Score >= 80 ? 'Tính sẵn sàng cao, tư duy chống lỗi cấp production' : 'Cần bổ sung kịch bản failover, circuit breaker và telemetry'
  });

  const overallScore = Math.round(
    pillars.reduce((acc, p) => acc + p.score * (p.weightPercentage / 100), 0)
  );

  let seniorityVerdict: SeniorityVerdict = 'Needs Architecture Practice';
  if (overallScore >= 88) seniorityVerdict = 'Principal/Staff Ready';
  else if (overallScore >= 75) seniorityVerdict = 'Senior Ready';
  else if (overallScore >= 60) seniorityVerdict = 'Mid-Level Contender';

  const topStrengths = pillars.flatMap(p => p.strengths).slice(0, 5);
  const criticalGaps = pillars.flatMap(p => p.gaps).slice(0, 4);

  return {
    id: `eval_${Date.now()}`,
    sessionId: '',
    evaluatedAt: new Date().toISOString(),
    overallScore,
    seniorityVerdict,
    targetRole,
    pillars,
    topStrengths,
    criticalGaps,
    tradeOffAnalysis: `Hệ thống ưu tiên ${blueprint.deepDive.consistencyModel} trên nền tảng ${blueprint.deepDive.databaseEngine}, phối hợp với ${blueprint.deepDive.cachingStrategy}. Đánh đổi giữa chi phí hạ tầng và độ trễ P99 (${blueprint.scope.latencyTargetP99Ms}ms) được giải quyết bằng ${blueprint.deepDive.partitionStrategy}.`,
    actionableRecommendations: [
      criticalGaps.length > 0 ? `Khắc phục ngay: ${criticalGaps[0]}` : 'Tối ưu hóa chi phí đường truyền băng thông CDN',
      'Chuẩn bị câu trả lời về Failure Recovery khi Redis Cluster hoặc DB Primary bị sập',
      'Định lượng rõ ràng metrics quan sát: Golden Signals (Latency, Traffic, Errors, Saturation)'
    ]
  };
}

export function exportBlueprintToMarkdown(
  session: SystemDesignSessionDTO,
  evaluation?: SystemDesignEvaluationDTO | null
): string {
  const { title, scenarioId, targetRole, capacityEstimates, blueprint } = session;
  const lines: string[] = [
    `# Báo Cáo Thiết Kế Hệ Thống: ${title}`,
    `**Kịch bản:** ${scenarioId} | **Mục tiêu:** ${targetRole} | **Trạng thái:** ${session.status}`,
    `**Thời gian tạo:** ${session.createdAt} | **Cập nhật:** ${session.updatedAt}`,
    '',
    '## 1. Ước Tính Năng Lực & Tài Nguyên (Capacity Planning)',
    `- **Lưu lượng đọc trung bình:** ${capacityEstimates.averageReadQps.toLocaleString()} QPS (Đỉnh: ${capacityEstimates.peakReadQps.toLocaleString()} QPS)`,
    `- **Lưu lượng ghi trung bình:** ${capacityEstimates.averageWriteQps.toLocaleString()} QPS (Đỉnh: ${capacityEstimates.peakWriteQps.toLocaleString()} QPS)`,
    `- **Băng thông Ingress/Egress:** ${capacityEstimates.ingressBandwidthMbps} Mbps / ${capacityEstimates.egressBandwidthMbps} Mbps`,
    `- **Dung lượng lưu trữ 5 năm:** ${capacityEstimates.retentionTotalStorageTb} TB`,
    `- **Bộ nhớ đệm Working Set (RAM):** ${capacityEstimates.cacheMemoryRequiredGb} GB`,
    `- **Khuyến nghị phần cứng:** ${capacityEstimates.recommendedAppServers} App Servers | ${capacityEstimates.recommendedCacheNodes} Cache Nodes | ${capacityEstimates.recommendedDbShards} DB Shards`,
    '',
    '## 2. Phạm Vi & Ràng Buộc (Scope & SLA)',
    '### Yêu cầu chức năng:',
    ...blueprint.scope.functionalRequirements.map(f => `- ${f}`),
    '',
    '### Yêu cầu phi chức năng:',
    ...blueprint.scope.nonFunctionalRequirements.map(nf => `- ${nf}`),
    `- **Mục tiêu Uptime:** ${blueprint.scope.slaTargetUptime}`,
    `- **Mục tiêu P99 Latency:** ${blueprint.scope.latencyTargetP99Ms}ms`,
    '',
    '## 3. Kiến Trúc Cấp Cao (High-Level Design)',
    '```mermaid',
    blueprint.highLevelDesign.mermaidDiagram.trim(),
    '```',
    '',
    '### API Endpoints:',
    ...blueprint.highLevelDesign.apiEndpoints.map(
      api => `- \`${api.method} ${api.path}\` (${api.protocol}): ${api.description}`
    ),
    '',
    '## 4. Deep Dive & Dữ Liệu',
    `- **Database Engine:** ${blueprint.deepDive.databaseEngine}`,
    `- **Chiến lược Caching:** ${blueprint.deepDive.cachingStrategy} (TTL: ${blueprint.deepDive.cacheTtlSeconds}s)`,
    `- **Chiến lược Phân vùng:** ${blueprint.deepDive.partitionStrategy}`,
    `- **Mô hình Nhất quán:** ${blueprint.deepDive.consistencyModel}`,
    `- **Kiểm soát Concurrency:** ${blueprint.deepDive.concurrencyControl}`,
    '',
    '## 5. Chống Lỗi & Độ Co Giãn (Resilience & Scalability)',
    '### Điểm nghẽn đơn độc (SPOF):',
    ...blueprint.resilience.singlePointsOfFailure.map(s => `- ${s}`),
    `- **Rate Limiting:** ${blueprint.resilience.rateLimitingStrategy}`,
    `- **Circuit Breaker:** ${blueprint.resilience.circuitBreakerPolicy}`,
    `- **Disaster Recovery:** ${blueprint.resilience.disasterRecoveryPlan}`
  ];

  if (evaluation) {
    lines.push(
      '',
      '---',
      '## 6. Đánh Giá Khảo Sát Kiến Trúc AI (AI Architecture Rubric)',
      `**Điểm tổng hợp:** ${evaluation.overallScore}/100 - **Xếp hạng:** ${evaluation.seniorityVerdict}`,
      '',
      '### Chi tiết từng trụ cột:',
      ...evaluation.pillars.map(p => `- **${p.name}:** ${p.score}/100 (Trọng số ${p.weightPercentage}%)`),
      '',
      '### Điểm mạnh nổi bật:',
      ...evaluation.topStrengths.map(s => `- ${s}`),
      '',
      '### Lỗ hổng cần cải thiện:',
      ...evaluation.criticalGaps.map(g => `- ${g}`),
      '',
      '### Phân tích đánh đổi (Trade-off):',
      evaluation.tradeOffAnalysis
    );
  }

  return lines.join('\n');
}

export function validateCapacityInput(raw: unknown): ValidationResult<SystemCapacityInputDTO> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Dữ liệu tính toán năng lực không hợp lệ.',
      errors: { input: 'Phải là đối tượng JSON.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const dau = Number(b.dailyActiveUsers);
  if (isNaN(dau) || dau < 1) {
    errors.dailyActiveUsers = 'Số người dùng hoạt động hàng ngày (DAU) phải >= 1.';
  }

  const reads = Number(b.readsPerUserPerDay);
  if (isNaN(reads) || reads < 0) {
    errors.readsPerUserPerDay = 'Lượt đọc trên mỗi user phải >= 0.';
  }

  const writes = Number(b.writesPerUserPerDay);
  if (isNaN(writes) || writes < 0) {
    errors.writesPerUserPerDay = 'Lượt ghi trên mỗi user phải >= 0.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Lỗi xác thực tham số năng lực hệ thống.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      dailyActiveUsers: dau,
      readsPerUserPerDay: reads,
      writesPerUserPerDay: writes,
      avgReadPayloadBytes: Number(b.avgReadPayloadBytes) || 1024,
      avgWritePayloadBytes: Number(b.avgWritePayloadBytes) || 512,
      peakLoadMultiplier: Number(b.peakLoadMultiplier) || 3,
      dataRetentionYears: Number(b.dataRetentionYears) || 3,
      cacheWorkingSetPercentage: Number(b.cacheWorkingSetPercentage) || 20
    }
  };
}

export function validateSystemDesignSessionInput(
  raw: unknown
): ValidationResult<SystemDesignSessionMutationInputDTO> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Dữ liệu phiên thiết kế không hợp lệ.',
      errors: { input: 'Phải là đối tượng JSON.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!b.title || typeof b.title !== 'string' || b.title.trim().length === 0) {
    errors.title = 'Tiêu đề thiết kế hệ thống là bắt buộc.';
  }

  const validScenarios: SystemDesignScenarioId[] = [
    'url_shortener',
    'ride_hailing_matching',
    'flash_sale',
    'distributed_notification_system',
    'custom_system'
  ];
  if (!b.scenarioId || typeof b.scenarioId !== 'string' || !validScenarios.includes(b.scenarioId as SystemDesignScenarioId)) {
    errors.scenarioId = 'Kịch bản thiết kế hệ thống không hợp lệ.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Lỗi xác thực phiên thiết kế.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      title: (b.title as string).trim(),
      scenarioId: b.scenarioId as SystemDesignScenarioId,
      targetRole: typeof b.targetRole === 'string' ? b.targetRole.trim() : 'Senior Software Engineer',
      difficulty: (b.difficulty as SystemDesignDifficulty) || 'senior',
      capacityInput: b.capacityInput as SystemCapacityInputDTO | undefined,
      blueprint: b.blueprint as SystemDesignBlueprintDTO | undefined,
      status: (b.status as SystemDesignSessionStatus) || 'draft'
    }
  };
}

export function validateSystemDesignBlueprintInput(
  raw: unknown
): ValidationResult<SystemDesignBlueprintDTO> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Bản thiết kế blueprint không hợp lệ.',
      errors: { input: 'Phải là đối tượng JSON.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!b.scope || typeof b.scope !== 'object') {
    errors.scope = 'Phạm vi thiết kế (scope) là bắt buộc.';
  }
  if (!b.highLevelDesign || typeof b.highLevelDesign !== 'object') {
    errors.highLevelDesign = 'Kiến trúc cấp cao (highLevelDesign) là bắt buộc.';
  }
  if (!b.deepDive || typeof b.deepDive !== 'object') {
    errors.deepDive = 'Phần thiết kế chi tiết (deepDive) là bắt buộc.';
  }
  if (!b.resilience || typeof b.resilience !== 'object') {
    errors.resilience = 'Phần khả năng chịu lỗi (resilience) là bắt buộc.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Lỗi xác thực bản thiết kế blueprint.',
      errors
    };
  }

  return {
    ok: true,
    data: b as unknown as SystemDesignBlueprintDTO
  };
}
