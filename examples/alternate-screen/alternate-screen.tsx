import React, {useReducer, useEffect, useRef, useCallback} from 'react';
import {
	render,
	Text,
	Box,
	useInput,
	useApp,
	useWindowSize,
} from '../../src/index.js';

type Point = {
	x: number;
	y: number;
};

type Direction = 'up' | 'down' | 'left' | 'right';

type GameState = {
	snake: Point[];
	food: Point;
	score: number;
	gameOver: boolean;
	won: boolean;
	frame: number;
};

type Action = {type: 'tick'; direction: Direction} | {type: 'restart'};

const headCharacter = '🦄';
const bodyCharacter = '✨';
const foodCharacter = '🌈';
const emptyCell = '  ';
const tickMs = 150;

const boardWidth = 20;
const boardHeight = 15;

const opposites: Record<Direction, Direction> = {
	up: 'down',
	down: 'up',
	left: 'right',
	right: 'left',
};

const offsets: Record<Direction, Point> = {
	up: {x: 0, y: -1},
	down: {x: 0, y: 1},
	left: {x: -1, y: 0},
	right: {x: 1, y: 0},
};

const rainbowColors = [
	'red',
	'#FF7F00',
	'yellow',
	'green',
	'cyan',
	'blue',
	'magenta',
] as const;

const borderH = '─'.repeat(boardWidth * 2);
const borderTop = `┌${borderH}┐`;
const borderBottom = `└${borderH}┘`;
const boardWidthChars = boardWidth * 2 + 2;

const initialSnake: Point[] = [
	{x: 10, y: 7},
	{x: 9, y: 7},
	{x: 8, y: 7},
];

function randomPosition(exclude: Point[]): Point {
	let point = {
		x: 0,
		y: 0,
	};
	let isExcluded = true;

	while (isExcluded) {
		point = {
			x: Math.floor(Math.random() * boardWidth),
			y: Math.floor(Math.random() * boardHeight),
		};

		isExcluded = false;
		for (const segment of exclude) {
			if (segment.x === point.x && segment.y === point.y) {
				isExcluded = true;
				break;
			}
		}
	}

	return point;
}

function createInitialState(): GameState {
	return {
		snake: initialSnake,
		food: randomPosition(initialSnake),
		score: 0,
		gameOver: false,
		won: false,
		frame: 0,
	};
}

export function gameReducer(state: GameState, action: Action): GameState {
	if (action.type === 'restart') {
		return createInitialState();
	}

	if (state.gameOver) {
		return state;
	}

	const head = state.snake[0]!;
	const offset = offsets[action.direction];
	const newHead: Point = {x: head.x + offset.x, y: head.y + offset.y};

	// Wall collision
	if (
		newHead.x < 0 ||
		newHead.x >= boardWidth ||
		newHead.y < 0 ||
		newHead.y >= boardHeight
	) {
		return {...state, gameOver: true, won: false};
	}

	const ateFood = newHead.x === state.food.x && newHead.y === state.food.y;
	const collisionSegments = ateFood ? state.snake : state.snake.slice(0, -1);

	if (
		collisionSegments.some(
			segment => segment.x === newHead.x && segment.y === newHead.y,
		)
	) {
		return {...state, gameOver: true, won: false};
	}

	const newSnake = [newHead, ...state.snake];

	if (!ateFood) {
		newSnake.pop();
	}

	if (ateFood && newSnake.length === boardWidth * boardHeight) {
		return {
			snake: newSnake,
			food: state.food,
			score: state.score + 1,
			gameOver: true,
			won: true,
			frame: state.frame + 1,
		};
	}

	return {
		snake: newSnake,
		food: ateFood ? randomPosition(newSnake) : state.food,
		score: state.score + (ateFood ? 1 : 0),
		gameOver: false,
		won: false,
		frame: state.frame + 1,
	};
}

function buildBoard(snake: Point[], food: Point): string {
	const headKey = `${snake[0]!.x},${snake[0]!.y}`;
	const snakeSet = new Set(snake.map(segment => `${segment.x},${segment.y}`));

	const rows: string[] = [borderTop];
	for (let y = 0; y < boardHeight; y++) {
		let row = '│';
		for (let x = 0; x < boardWidth; x++) {
			const key = `${x},${y}`;
			if (key === headKey) {
				row += headCharacter;
			} else if (snakeSet.has(key)) {
				row += bodyCharacter;
			} else if (food.x === x && food.y === y) {
				row += foodCharacter;
			} else {
				row += emptyCell;
			}
		}

		row += '│';
		rows.push(row);
	}

	rows.push(borderBottom);
	return rows.join('\n');
}

function SnakeGame() {
	const {exit} = useApp();
	const {columns} = useWindowSize();
	const [game, dispatch] = useReducer(
		gameReducer,
		undefined,
		createInitialState,
	);
	const directionReference = useRef<Direction>('right');

	const tick = useCallback(() => {
		dispatch({type: 'tick', direction: directionReference.current});
	}, []);

	useEffect(() => {
		const timer = setInterval(tick, tickMs);
		return () => {
			clearInterval(timer);
		};
	}, [tick]);

	useInput((input, key) => {
		if (input === 'q') {
			exit();
		}

		if (game.gameOver && input === 'r') {
			directionReference.current = 'right';
			dispatch({type: 'restart'});
			return;
		}

		if (game.gameOver) {
			return;
		}

		const {current} = directionReference;
		if (key.upArrow && current !== 'down') {
			directionReference.current = 'up';
		} else if (key.downArrow && current !== 'up') {
			directionReference.current = 'down';
		} else if (key.leftArrow && current !== 'right') {
			directionReference.current = 'left';
		} else if (key.rightArrow && current !== 'left') {
			directionReference.current = 'right';
		}
	});

	const titleColor = rainbowColors[game.frame % rainbowColors.length]!;
	const board = buildBoard(game.snake, game.food);
	const marginLeft = Math.max(Math.floor((columns - boardWidthChars) / 2), 0);

	return (
		<Box flexDirection="column" paddingY={1}>
			<Box justifyContent="center">
				<Text bold color={titleColor}>
					🦄 Unicorn Snake 🦄
				</Text>
			</Box>

			<Box justifyContent="center" marginTop={1}>
				<Text bold color="yellow">
					Score: {game.score}
				</Text>
			</Box>

			<Box marginLeft={marginLeft} marginTop={1}>
				<Text>{board}</Text>
			</Box>

			{game.gameOver ? (
				<Box justifyContent="center" marginTop={1}>
					<Text bold color="red">
						{game.won ? 'You Win!' : 'Game Over!'}{' '}
					</Text>
					<Text dimColor>r: restart | q: quit</Text>
				</Box>
			) : (
				<Box justifyContent="center" marginTop={1}>
					<Text dimColor>
						Arrow keys: move | Eat {foodCharacter} to grow | q: quit
					</Text>
				</Box>
			)}
		</Box>
	);
}

export function runAlternateScreenExample() {
	render(<SnakeGame />, {alternateScreen: true});
}
