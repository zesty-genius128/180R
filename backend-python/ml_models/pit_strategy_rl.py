"""
F1 Pit Strategy Optimization using Reinforcement Learning
=========================================================

This module implements a Q-Learning agent that learns optimal pit stop strategies
by simulating thousands of F1 race scenarios. The agent considers:

- Current tire degradation and remaining life
- Track position and competitors nearby
- Lap number and remaining race distance
- Weather conditions and tire compound performance
- Traffic and overtaking difficulty

The RL agent learns to make optimal pit stop decisions that minimize total race time
while considering strategic elements like undercut/overcut opportunities.
"""

import numpy as np
import pandas as pd
import pickle
import random
from collections import defaultdict, deque
from datetime import datetime
import json

# Import our existing tire degradation model
from .tire_degradation import TireDegradationPredictor


class F1RaceEnvironment:
    """
    F1 Race simulation environment for reinforcement learning.
    
    State Space:
    - Current lap (0-70)
    - Tire age in laps (0-50)
    - Tire compound (0=SOFT, 1=MEDIUM, 2=HARD)
    - Track position (1-20)
    - Tire degradation level (0.0-5.0 seconds)
    - Laps remaining (0-70)
    - Weather conditions (0=DRY, 1=WET)
    
    Action Space:
    - 0: Continue (no pit stop)
    - 1: Pit for SOFT tires
    - 2: Pit for MEDIUM tires  
    - 3: Pit for HARD tires
    """
    
    def __init__(self, tire_model=None):
        self.tire_model = tire_model or TireDegradationPredictor()
        
        # Race parameters
        self.total_laps = 70  # Typical F1 race length
        self.pit_stop_time = 24.0  # Average pit stop time in seconds
        self.overtake_difficulty = 1.2  # Time penalty for being behind traffic
        
        # Tire compound characteristics
        self.tire_compounds = {
            0: 'SOFT',    # Fast but degrades quickly
            1: 'MEDIUM',  # Balanced performance
            2: 'HARD'     # Slow but durable
        }
        
        # Track characteristics (example: Silverstone)
        self.track_data = {
            'name': 'Silverstone',
            'lap_distance': 5.891,  # km
            'base_lap_time': 85.0,  # seconds
            'overtaking_zones': 3,
            'tire_wear_severity': 0.8
        }
        
        self.reset()
    
    def reset(self, driver='HAM', track='Silverstone'):
        """Reset environment to start of race."""
        self.current_lap = 1
        self.tire_age = 0
        self.tire_compound = 1  # Start on MEDIUM tires
        self.track_position = random.randint(1, 20)  # Random grid position
        self.driver = driver
        self.track = track
        self.total_time = 0.0
        self.pit_stops = 0
        self.weather = 0  # Start with dry weather
        
        # Race history for learning
        self.lap_times = []
        self.pit_history = []
        
        return self._get_state()
    
    def _get_state(self):
        """Get current state representation."""
        # Predict current tire degradation
        if self.tire_model.is_trained:
            degradation = self.tire_model.predict_degradation(
                tire_age=self.tire_age,
                compound=self.tire_compounds[self.tire_compound],
                driver=self.driver,
                track=self.track,
                track_temp=35,  # Default track temperature
                lap_number=self.current_lap,
                fuel_load=max(0, 110 - self.current_lap * 1.8)
            )
        else:
            # Fallback degradation calculation
            base_rate = [0.08, 0.04, 0.02][self.tire_compound]  # SOFT, MEDIUM, HARD
            degradation = base_rate * self.tire_age * (1 + self.tire_age * 0.02)
        
        state = np.array([
            self.current_lap / self.total_laps,           # Normalized lap progress
            self.tire_age / 50.0,                         # Normalized tire age
            self.tire_compound / 2.0,                     # Normalized compound
            self.track_position / 20.0,                   # Normalized position
            min(degradation, 5.0) / 5.0,                 # Normalized degradation
            (self.total_laps - self.current_lap) / self.total_laps,  # Remaining race
            self.weather,                                 # Weather condition
            self.pit_stops / 3.0                         # Normalized pit stops
        ])
        
        return state
    
    def step(self, action):
        """Execute action and return new state, reward, done flag."""
        reward = 0
        done = False
        
        # Calculate current lap time with tire degradation
        base_lap_time = self.track_data['base_lap_time']
        
        # Get tire degradation
        if self.tire_model.is_trained:
            degradation = self.tire_model.predict_degradation(
                tire_age=self.tire_age,
                compound=self.tire_compounds[self.tire_compound],
                driver=self.driver,
                track=self.track,
                track_temp=35,
                lap_number=self.current_lap,
                fuel_load=max(0, 110 - self.current_lap * 1.8)
            )
        else:
            base_rate = [0.08, 0.04, 0.02][self.tire_compound]
            degradation = base_rate * self.tire_age * (1 + self.tire_age * 0.02)
        
        # Apply degradation and traffic penalty
        current_lap_time = base_lap_time + degradation
        if self.track_position > 10:  # Traffic penalty for lower positions
            current_lap_time += (self.track_position - 10) * 0.1
        
        # Execute action
        if action == 0:  # Continue racing
            self.tire_age += 1
            self.total_time += current_lap_time
            
        else:  # Pit stop (actions 1, 2, 3 = SOFT, MEDIUM, HARD)
            # Pit stop penalty
            self.total_time += current_lap_time + self.pit_stop_time
            
            # Change tires
            new_compound = action - 1  # Convert action to compound index
            self.tire_compound = new_compound
            self.tire_age = 0
            self.pit_stops += 1
            
            # Track position penalty (lose ~3 positions per pit stop)
            position_loss = min(3, 20 - self.track_position)
            self.track_position = min(20, self.track_position + position_loss)
            
            # Record pit stop
            self.pit_history.append({
                'lap': self.current_lap,
                'compound': self.tire_compounds[new_compound],
                'position': self.track_position
            })
            
            # Reward for strategic pit stops (undercut opportunity)
            if self.current_lap > 15 and self.tire_age > 15:
                reward += 5  # Good strategic timing
        
        # Record lap time
        self.lap_times.append(current_lap_time)
        
        # Advance to next lap
        self.current_lap += 1
        
        # Check if race is finished
        if self.current_lap > self.total_laps:
            done = True
            # Final reward based on race time (negative because we want to minimize time)
            reward -= self.total_time / 100.0  # Scale reward
            
            # Bonus for reasonable pit stop strategy
            if 1 <= self.pit_stops <= 2:
                reward += 10  # Reward for realistic strategy
            elif self.pit_stops == 0 or self.pit_stops > 3:
                reward -= 5   # Penalty for unrealistic strategy
        
        # Small penalty for each lap to encourage faster completion
        reward -= 0.1
        
        # Weather change (10% chance per lap)
        if random.random() < 0.1:
            self.weather = 1 - self.weather  # Toggle weather
            if self.weather == 1:  # Rain started
                reward -= 2  # Weather penalty
        
        return self._get_state(), reward, done
    
    def get_race_summary(self):
        """Get summary of completed race."""
        return {
            'total_time': self.total_time,
            'pit_stops': self.pit_stops,
            'pit_history': self.pit_history,
            'final_position': self.track_position,
            'average_lap_time': np.mean(self.lap_times) if self.lap_times else 0,
            'total_laps': len(self.lap_times),
            'tire_degradation_profile': self._get_degradation_profile()
        }
    
    def _get_degradation_profile(self):
        """Analyze tire degradation throughout the race."""
        profile = []
        temp_age = 0
        temp_compound = 1
        
        for i, lap_time in enumerate(self.lap_times):
            # Check if there was a pit stop this lap
            pit_this_lap = any(pit['lap'] == i + 1 for pit in self.pit_history)
            
            if pit_this_lap:
                pit = next(pit for pit in self.pit_history if pit['lap'] == i + 1)
                temp_compound = list(self.tire_compounds.values()).index(pit['compound'])
                temp_age = 0
            
            profile.append({
                'lap': i + 1,
                'tire_age': temp_age,
                'compound': self.tire_compounds[temp_compound],
                'lap_time': lap_time
            })
            
            temp_age += 1
        
        return profile


class PitStrategyQLearning:
    """
    Q-Learning agent for F1 pit strategy optimization.
    
    Uses epsilon-greedy exploration and experience replay to learn
    optimal pit stop timing and tire compound selection.
    """
    
    def __init__(self, state_size=8, action_size=4, learning_rate=0.1, 
                 discount_factor=0.95, epsilon=1.0, epsilon_decay=0.995, 
                 epsilon_min=0.01):
        
        self.state_size = state_size
        self.action_size = action_size
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.epsilon = epsilon
        self.epsilon_decay = epsilon_decay
        self.epsilon_min = epsilon_min
        
        # Q-table using defaultdict for sparse representation
        self.q_table = defaultdict(lambda: np.zeros(action_size))
        
        # Experience replay buffer
        self.memory = deque(maxlen=10000)
        self.batch_size = 32
        
        # Training statistics
        self.training_rewards = []
        self.training_times = []
        self.episode_count = 0
        
    def _state_to_key(self, state):
        """Convert continuous state to discrete key for Q-table."""
        # Discretize state into bins for Q-table lookup
        bins = 10  # Number of bins per dimension
        discrete_state = []
        
        for i, value in enumerate(state):
            bin_value = int(np.clip(value * bins, 0, bins - 1))
            discrete_state.append(bin_value)
        
        return tuple(discrete_state)
    
    def choose_action(self, state, training=True):
        """Choose action using epsilon-greedy policy."""
        if training and random.random() < self.epsilon:
            return random.randint(0, self.action_size - 1)
        
        state_key = self._state_to_key(state)
        q_values = self.q_table[state_key]
        return np.argmax(q_values)
    
    def remember(self, state, action, reward, next_state, done):
        """Store experience in replay buffer."""
        self.memory.append((state, action, reward, next_state, done))
    
    def train_step(self, state, action, reward, next_state, done):
        """Update Q-values using Q-learning update rule."""
        state_key = self._state_to_key(state)
        next_state_key = self._state_to_key(next_state)
        
        # Current Q-value
        current_q = self.q_table[state_key][action]
        
        # Target Q-value
        if done:
            target_q = reward
        else:
            next_max_q = np.max(self.q_table[next_state_key])
            target_q = reward + self.discount_factor * next_max_q
        
        # Q-learning update
        self.q_table[state_key][action] = current_q + self.learning_rate * (target_q - current_q)
    
    def train_episode(self, env, driver='HAM', track='Silverstone'):
        """Train agent for one episode."""
        state = env.reset(driver, track)
        total_reward = 0
        steps = 0
        
        while True:
            # Choose and execute action
            action = self.choose_action(state, training=True)
            next_state, reward, done = env.step(action)
            
            # Train on this experience
            self.train_step(state, action, reward, next_state, done)
            
            # Remember experience
            self.remember(state, action, reward, next_state, done)
            
            total_reward += reward
            steps += 1
            state = next_state
            
            if done:
                break
        
        # Decay epsilon
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay
        
        # Record training statistics
        self.training_rewards.append(total_reward)
        race_summary = env.get_race_summary()
        self.training_times.append(race_summary['total_time'])
        self.episode_count += 1
        
        return total_reward, race_summary
    
    def train(self, episodes=1000, env=None, drivers=['HAM', 'VER', 'LEC'], 
              tracks=['Silverstone', 'Monaco', 'Spa']):
        """Train the agent over multiple episodes."""
        if env is None:
            env = F1RaceEnvironment()
        
        print(f"🏋️ Training Q-Learning agent for {episodes} episodes...")
        print(f"👨‍🏎️ Drivers: {drivers}")
        print(f"🏁 Tracks: {tracks}")
        
        best_time = float('inf')
        best_strategy = None
        
        for episode in range(episodes):
            # Rotate through different drivers and tracks for variety
            driver = random.choice(drivers)
            track = random.choice(tracks)
            
            # Train one episode
            total_reward, race_summary = self.train_episode(env, driver, track)
            
            # Track best performance
            if race_summary['total_time'] < best_time:
                best_time = race_summary['total_time']
                best_strategy = race_summary
            
            # Print progress
            if (episode + 1) % 100 == 0:
                avg_reward = np.mean(self.training_rewards[-100:])
                avg_time = np.mean(self.training_times[-100:])
                print(f"Episode {episode + 1:4d} | "
                      f"Avg Reward: {avg_reward:7.2f} | "
                      f"Avg Time: {avg_time:7.1f}s | "
                      f"Epsilon: {self.epsilon:.3f} | "
                      f"Best Time: {best_time:.1f}s")
        
        print(f"\n✅ Training completed!")
        print(f"🏆 Best race time: {best_time:.1f} seconds")
        print(f"🔄 Best strategy: {best_strategy['pit_stops']} pit stops")
        
        return best_strategy
    
    def predict_strategy(self, env, driver='HAM', track='Silverstone', verbose=True):
        """Predict optimal strategy for given conditions."""
        state = env.reset(driver, track)
        strategy = []
        
        if verbose:
            print(f"\n🔮 Predicting optimal strategy for {driver} at {track}")
        
        while True:
            # Choose best action (no exploration)
            action = self.choose_action(state, training=False)
            
            # Record strategy decision
            if action > 0:  # Pit stop
                compound = ['SOFT', 'MEDIUM', 'HARD'][action - 1]
                strategy.append({
                    'lap': env.current_lap,
                    'action': 'PIT',
                    'compound': compound,
                    'position': env.track_position,
                    'tire_age': env.tire_age
                })
                
                if verbose:
                    print(f"🏁 Lap {env.current_lap:2d}: PIT for {compound} tires "
                          f"(Position {env.track_position}, Tire age {env.tire_age})")
            
            # Execute action
            next_state, reward, done = env.step(action)
            state = next_state
            
            if done:
                break
        
        race_summary = env.get_race_summary()
        
        if verbose:
            print(f"\n📊 Race Summary:")
            print(f"   Total Time: {race_summary['total_time']:.1f} seconds")
            print(f"   Pit Stops: {race_summary['pit_stops']}")
            print(f"   Final Position: {race_summary['final_position']}")
            print(f"   Average Lap Time: {race_summary['average_lap_time']:.2f}s")
        
        return strategy, race_summary
    
    def save_model(self, filepath='models/pit_strategy_rl.pkl'):
        """Save trained Q-table and agent parameters."""
        model_data = {
            'q_table': dict(self.q_table),  # Convert defaultdict to regular dict
            'state_size': self.state_size,
            'action_size': self.action_size,
            'learning_rate': self.learning_rate,
            'discount_factor': self.discount_factor,
            'epsilon': self.epsilon,
            'epsilon_min': self.epsilon_min,
            'training_rewards': self.training_rewards,
            'training_times': self.training_times,
            'episode_count': self.episode_count,
            'timestamp': datetime.now().isoformat()
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        print(f"💾 RL model saved to {filepath}")
        return True
    
    def load_model(self, filepath='models/pit_strategy_rl.pkl'):
        """Load trained Q-table and agent parameters."""
        try:
            with open(filepath, 'rb') as f:
                model_data = pickle.load(f)
            
            self.q_table = defaultdict(lambda: np.zeros(self.action_size))
            self.q_table.update(model_data['q_table'])
            
            self.state_size = model_data['state_size']
            self.action_size = model_data['action_size']
            self.learning_rate = model_data['learning_rate']
            self.discount_factor = model_data['discount_factor']
            self.epsilon = model_data['epsilon']
            self.epsilon_min = model_data['epsilon_min']
            self.training_rewards = model_data['training_rewards']
            self.training_times = model_data['training_times']
            self.episode_count = model_data['episode_count']
            
            print(f"📂 RL model loaded from {filepath}")
            print(f"🎯 Trained for {self.episode_count} episodes")
            return True
            
        except Exception as e:
            print(f"❌ Error loading RL model: {e}")
            return False


# Demo usage and testing
if __name__ == "__main__":
    # Initialize environment and agent
    tire_model = TireDegradationPredictor()
    env = F1RaceEnvironment(tire_model)
    agent = PitStrategyQLearning()
    
    # Train the agent
    print("🚀 Starting RL training for F1 pit strategy optimization...")
    best_strategy = agent.train(episodes=500, env=env)
    
    # Test the trained agent
    print("\n🧪 Testing trained agent...")
    strategy, summary = agent.predict_strategy(env, driver='HAM', track='Silverstone')
    
    # Save the model
    agent.save_model()
    
    print(f"\n🏁 RL Training Complete!")
    print(f"📈 Agent learned from {agent.episode_count} race simulations")
    print(f"🎯 Ready for real-world strategy optimization!")