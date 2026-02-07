import React, {useState, useEffect} from 'react';
import {
	render,
	Text,
	Box,
	useInput,
	useStdout,
	useApp,
} from '../../src/index.js';

const rows = [
	'Server Authentication Module - Handles JWT token validation, OAuth2 flows, and session management across distributed systems',
	'Database Connection Pool - Maintains persistent connections to PostgreSQL cluster with automatic failover and load balancing',
	'API Gateway Service - Routes incoming HTTP requests to microservices with rate limiting and request transformation',
	'User Profile Manager - Caches user data in Redis with write-through policy and invalidation strategies',
	'Payment Processing Engine - Integrates with Stripe, PayPal, and Square APIs for transaction processing',
	'Email Notification Queue - Processes outbound emails through SendGrid with retry logic and delivery tracking',
	'File Storage Handler - Manages S3 bucket operations with multipart uploads and CDN integration',
	'Search Indexer Service - Maintains Elasticsearch indices with real-time document updates and reindexing',
	'Metrics Aggregation Pipeline - Collects and processes telemetry data for Prometheus and Grafana dashboards',
	'WebSocket Connection Manager - Handles real-time bidirectional communication for chat and notifications',
	'Cache Invalidation Service - Coordinates distributed cache updates across Redis cluster nodes',
	'Background Job Processor - Executes async tasks via RabbitMQ with dead letter queue handling',
	'Session Store Manager - Persists user sessions in DynamoDB with TTL and cross-region replication',
	'Rate Limiter Module - Enforces API quotas using token bucket algorithm with Redis backend',
	'Content Delivery Network - Serves static assets through Cloudflare with edge caching and GZIP compression',
	'Logging Aggregator - Streams application logs to ELK stack with structured JSON formatting',
	'Health Check Monitor - Performs periodic service health checks with circuit breaker pattern implementation',
	'Configuration Manager - Loads environment-specific settings from Consul with hot reload capability',
	'Security Scanner Service - Runs automated vulnerability scans and dependency checks on deployed applications',
	'Backup Orchestrator - Schedules and executes automated database backups with encryption and versioning',
	'Load Balancer Controller - Manages NGINX upstream servers with health-based traffic distribution',
	'Container Orchestration - Coordinates Docker container lifecycle via Kubernetes with auto-scaling policies',
	'Message Bus Coordinator - Routes events through Apache Kafka topics with guaranteed delivery semantics',
	'Analytics Data Warehouse - Aggregates business metrics in Snowflake with incremental ETL processes',
	'API Documentation Service - Generates and serves OpenAPI specs with interactive Swagger UI',
	'Feature Flag Manager - Controls feature rollouts using LaunchDarkly with user targeting and percentage rollouts',
	'Audit Trail Logger - Records all user actions and system events for compliance and security analysis',
	'Image Processing Pipeline - Resizes and optimizes uploaded images using Sharp with multiple format outputs',
	'Geolocation Service - Resolves IP addresses to geographic coordinates using MaxMind GeoIP2 database',
	'Recommendation Engine - Generates personalized content suggestions using collaborative filtering algorithms',
];

const generateLogLine = (index: number, value: number) => {
	const timestamp = new Date().toLocaleTimeString();
	const actions = [
		'PROCESSING',
		'COMPLETED',
		'UPDATING',
		'SYNCING',
		'VALIDATING',
		'EXECUTING',
	];
	const action = actions[Math.floor(Math.random() * actions.length)];
	return `[${timestamp}] Worker-${index} ${action}: Batch=${value} Throughput=${(Math.random() * 1000).toFixed(0)}req/s Memory=${(Math.random() * 512).toFixed(1)}MB CPU=${(Math.random() * 100).toFixed(1)}%`;
};

function IncrementalRendering() {
	const {exit} = useApp();
	const {stdout} = useStdout();
	const terminalHeight = stdout.rows || 24; // Default to 24 if not available

	// Calculate available space for dynamic content
	// Header box: ~9 lines (border + content)
	// Logs box: variable (border + title + log lines)
	// Services box: variable (border + title + services)
	// Footer box: ~3 lines
	// Margins: ~3 lines
	// Total fixed: ~15 lines, so available = terminalHeight - 15
	const availableLines = Math.max(terminalHeight - 15, 10);

	// Split available space: ~30% for logs, ~70% for services
	const logLineCount = Math.max(Math.floor(availableLines * 0.3), 3);
	const serviceCount = Math.min(
		Math.max(Math.floor(availableLines * 0.7), 5),
		rows.length,
	);

	const [selectedIndex, setSelectedIndex] = useState(0);
	const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString());
	const [counter, setCounter] = useState(0);
	const [fps, setFps] = useState(0);
	const [progress1, setProgress1] = useState(0);
	const [progress2, setProgress2] = useState(0);
	const [progress3, setProgress3] = useState(0);
	const [randomValue, setRandomValue] = useState(0);
	const [logLines, setLogLines] = useState(
		Array.from({length: logLineCount}, (_, i) => generateLogLine(i, 0)),
	);

	// Update timestamp and counter every second to show live updates
	useEffect(() => {
		const timer = setInterval(() => {
			setTimestamp(new Date().toLocaleTimeString());
			setCounter(previous => previous + 1);
		}, 1000);

		return () => {
			clearInterval(timer);
		};
	}, []);

	// Rapid updates to degrade performance - updates every 16ms (~60fps)
	useEffect(() => {
		let frameCount = 0;
		let lastTime = Date.now();

		const timer = setInterval(() => {
			setProgress1(previous => (previous + 1) % 101);
			setProgress2(previous => (previous + 2) % 101);
			setProgress3(previous => (previous + 3) % 101);
			setRandomValue(Math.floor(Math.random() * 1000));

			// Update only 1-2 log lines each frame (simulating real log updates)
			setLogLines(previous => {
				const newLines = [...previous];
				const updateIndex = Math.floor(Math.random() * newLines.length);
				newLines[updateIndex] = generateLogLine(
					updateIndex,
					Math.floor(Math.random() * 1000),
				);
				return newLines;
			});

			// Calculate FPS
			frameCount++;
			const now = Date.now();
			if (now - lastTime >= 1000) {
				setFps(frameCount);
				frameCount = 0;
				lastTime = now;
			}
		}, 16); // ~60 updates per second

		return () => {
			clearInterval(timer);
		};
	}, []);

	useInput((input, key) => {
		if (key.upArrow) {
			setSelectedIndex(previousIndex =>
				previousIndex === 0 ? serviceCount - 1 : previousIndex - 1,
			);
		}

		if (key.downArrow) {
			setSelectedIndex(previousIndex =>
				previousIndex === serviceCount - 1 ? 0 : previousIndex + 1,
			);
		}

		if (input === 'q') {
			exit();
		}
	});

	const progressBar = (value: number) => {
		const filled = Math.floor(value / 5);
		const empty = 20 - filled;
		return '█'.repeat(filled) + '░'.repeat(empty);
	};

	return (
		<Box flexDirection="column" height="100%">
			<Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
				<Box flexDirection="column">
					<Text bold color="cyan">
						Incremental Rendering Demo - incrementalRendering={String(true)}
					</Text>
					<Text dimColor>
						Use ↑/↓ arrows to navigate • Press q to quit • FPS: {fps}
					</Text>
					<Text>
						Time: <Text color="green">{timestamp}</Text> • Updates:{' '}
						<Text color="yellow">{counter}</Text> • Random:{' '}
						<Text color="cyan">{randomValue}</Text>
					</Text>
					<Text>
						Progress 1: <Text color="green">{progressBar(progress1)}</Text>{' '}
						{progress1}%
					</Text>
					<Text>
						Progress 2: <Text color="yellow">{progressBar(progress2)}</Text>{' '}
						{progress2}%
					</Text>
					<Text>
						Progress 3: <Text color="red">{progressBar(progress3)}</Text>{' '}
						{progress3}%
					</Text>
				</Box>
			</Box>

			<Box
				borderStyle="single"
				borderColor="yellow"
				paddingX={2}
				paddingY={1}
				marginTop={1}
			>
				<Box flexDirection="column">
					<Text bold color="yellow">
						Live Logs (only 1-2 lines update per frame):
					</Text>
					{logLines.map(line => (
						<Text key={line} color="green">
							{line}
						</Text>
					))}
				</Box>
			</Box>

			<Box
				borderStyle="single"
				borderColor="gray"
				paddingX={2}
				paddingY={1}
				marginTop={1}
				flexGrow={1}
				flexDirection="column"
			>
				<Text bold color="magenta">
					System Services Monitor ({serviceCount} of {rows.length} services):
				</Text>
				{rows.slice(0, serviceCount).map((row, index) => {
					const isSelected = index === selectedIndex;
					return (
						<Text key={row} color={isSelected ? 'blue' : 'white'}>
							{isSelected ? '> ' : '  '}
							{row}
						</Text>
					);
				})}
			</Box>

			<Box borderStyle="round" borderColor="magenta" paddingX={2} marginTop={1}>
				<Text>
					Selected:{' '}
					<Text bold color="magenta">
						{rows.slice(0, serviceCount)[selectedIndex]}
					</Text>
				</Text>
			</Box>
		</Box>
	);
}

render(<IncrementalRendering />, {incrementalRendering: true});
