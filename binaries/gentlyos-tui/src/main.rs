//! GentlyOS TUI application.

use std::io;
use crossterm::{
    event::{self, Event, KeyCode, KeyEventKind},
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
    ExecutableCommand,
};
use ratatui::{
    prelude::*,
    widgets::{Block, Borders, Paragraph, Tabs},
};

struct App {
    running: bool,
    tab_index: usize,
    tabs: Vec<String>,
    status: String,
}

impl App {
    fn new() -> Self {
        App {
            running: true,
            tab_index: 0,
            tabs: vec!["Dashboard".into(), "Sessions".into(), "Search".into(), "Logs".into(), "Settings".into()],
            status: "Ready".into(),
        }
    }
    fn next_tab(&mut self) { self.tab_index = (self.tab_index + 1) % self.tabs.len(); }
    fn prev_tab(&mut self) { self.tab_index = if self.tab_index == 0 { self.tabs.len() - 1 } else { self.tab_index - 1 }; }
}

fn main() -> anyhow::Result<()> {
    enable_raw_mode()?;
    io::stdout().execute(EnterAlternateScreen)?;
    let mut terminal = Terminal::new(CrosstermBackend::new(io::stdout()))?;
    let mut app = App::new();

    while app.running {
        terminal.draw(|frame| render_ui(frame, &app))?;
        if event::poll(std::time::Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                if key.kind == KeyEventKind::Press {
                    match key.code {
                        KeyCode::Char('q') => app.running = false,
                        KeyCode::Tab => app.next_tab(),
                        KeyCode::BackTab => app.prev_tab(),
                        _ => {}
                    }
                }
            }
        }
    }

    disable_raw_mode()?;
    io::stdout().execute(LeaveAlternateScreen)?;
    Ok(())
}

fn render_ui(frame: &mut Frame, app: &App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(3), Constraint::Min(0), Constraint::Length(1)])
        .split(frame.area());

    let titles: Vec<&str> = app.tabs.iter().map(|t| t.as_str()).collect();
    let tabs = Tabs::new(titles)
        .block(Block::default().borders(Borders::ALL).title(" GentlyOS "))
        .select(app.tab_index)
        .highlight_style(Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD));
    frame.render_widget(tabs, chunks[0]);

    let content = Paragraph::new(format!("Tab: {}", app.tabs[app.tab_index]))
        .block(Block::default().borders(Borders::ALL));
    frame.render_widget(content, chunks[1]);

    let status = Paragraph::new(format!(" {} | q=quit Tab=switch", app.status))
        .style(Style::default().fg(Color::DarkGray));
    frame.render_widget(status, chunks[2]);
}
