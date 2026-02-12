# BattleshipAI

<p align="center"><img src='https://i.postimg.cc/tCfbZ5v4/Battle-Ship-Logo.png' alt="BattleshipAI Logo" height="400"></p>


## Authors 🧑‍💻​🧑‍💻​

- **Salvatore Grimaldi** - [SalvatoreGrimaldi](https://github.com/salvatoregrimaldi03)
- **Ciro Esposito** - [CiroEsposito](https://github.com/ciroesposito04)
- **Lorenzo Di Riso** - [LorenzoDiRiso](https://github.com/ldiriso4)


## Project Objective & Resources 💡
**BattleshipAI** is a web-based simulation platform designed to analyze and compare artificial intelligence strategies within the context of the classic Battleship game. Facilitating both Human-vs-Agent and Agent-vs-Agent modes, the system automates the entire game flow—from board configuration to turn management—to evaluate autonomous decision-making behaviors and distinct attack algorithms in a controlled environment. The project focuses on data-driven performance analysis, collecting real-time match metrics to generate detailed statistical visualizations that highlight the efficiency of different AI strategies. Built with a modular and extensible architecture, BattleshipAI serves as a robust foundation for algorithmic study, allowing for the seamless integration of future strategies and advanced analytical tools.        
The repository resources include:

**Core Game (Human vs. Agent)**
- `index.html`: The main entry point of the application. It hosts the user interface for the Human vs. AI tactical command mode.
- `script.js`: Contains the core game logic for the single-player mode, managing state, DOM interactions, and the decision-making process for the opponent AI.

**AI Simulation (Agent vs. Agent)**
- `ai_vs_ai.html`: A dedicated visualization interface for observing real-time matches between two autonomous AI agents.
- `ai_vs_ai.js`: Manages the automated game loop, turn synchronization, and real-time event logging for the AI vs. AI simulation mode.

**Stress Testing & Mass Analysis**
- `multi_sim.html`: The dashboard for configuring and executing large-scale batch simulations (Stress Tests) to gather statistical data over hundreds of matches.
- `multi_sim.js`: Handles the background processing of rapid match iterations, calculates aggregate win rates, computes average turn trends, and renders comparative charts.

**Reporting & Analytics**
- `report.html`: The structural template used to generate the detailed "Mission Report".
- `report.js`: The analytics engine that retrieves match data from LocalStorage, renders visualization graphs using Chart.js, and handles the PDF export via html2pdf.
- `report.css`: A specialized stylesheet optimized for print media, ensuring high-contrast visibility and correct pagination when generating PDF reports.

**Global Assets**
- `style.css`: The global stylesheet defining the application's "cyber-tactical" aesthetic, grid systems, animations, and responsive layout.

## 🚀 How to try it?
1. Clone the repository:
   ```bash
   git clone https://github.com/salvatoregrimaldi03/BattleshipAI.git
   ```
2. Go to the directory BattleshipAI:
   ```bash
   cd BattleshipAI
   ```
3. Starting index.html with the command start:
   ```bash
   start index.html
   ```
## 🧱 Built With
- [HTML](https://html.spec.whatwg.org/) – Markup language used to define the structure of the tactical interface and game grids.  
- [CSS](https://www.w3.org/TR/css/) – Style sheet language used for the visual appearance, animations, and report layout.  
- [JavaScript](https://www.javascript.com/) – Programming language used to implement game logic, AI strategies, and statistical analysis.
