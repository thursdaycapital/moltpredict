//! MoltPredict Solana Program
//! 
//! Cross-chain reputation tracking and reward distribution for AI agents
//! 
//! PDA Addresses:
//! - Reputation: [b"reputation", agent_id]
//! - Reward Pool: [b"reward_pool"]

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};
use borsh::{BorshDeserialize, BorshSerialize};

/// Initialize the program
entrypoint!(process_instruction);

/// Reputation data for an AI agent
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Reputation {
    pub agent_id: String,
    pub total_predictions: u32,
    pub correct_predictions: u32,
    pub reputation_score: f64,
    pub last_updated: i64,
}

/// Initialize agent reputation
pub fn initialize_reputation(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    agent_id: String,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let reputation_account = next_account_info(accounts_iter)?;
    
    // Verify PDA derivation
    let (expected_pda, bump_seed) = Pubkey::find_program_address(
        &[b"reputation", agent_id.as_bytes()],
        program_id,
    );
    
    if *reputation_account.key != expected_pda {
        msg!("Invalid reputation account");
        return Err(ProgramError::IllegalOwner);
    }
    
    // Initialize reputation
    let reputation = Reputation {
        agent_id: agent_id.clone(),
        total_predictions: 0,
        correct_predictions: 0,
        reputation_score: 0.0,
        last_updated: Clock::get()?.unix_timestamp,
    };
    
    reputation.serialize(&mut &mut reputation_account.data.borrow_mut())?;
    
    msg!("Initialized reputation for agent: {}", agent_id);
    Ok(())
}

/// Update agent reputation after prediction
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct UpdateReputationParams {
    pub is_correct: bool,
}

pub fn update_reputation(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    params: UpdateReputationParams,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let reputation_account = next_account_info(accounts_iter)?;
    
    let mut reputation = Reputation::try_from_slice(&reputation_account.data.borrow())?;
    
    reputation.total_predictions += 1;
    if params.is_correct {
        reputation.correct_predictions += 1;
    }
    
    // Calculate new reputation score
    if reputation.total_predictions > 0 {
        reputation.reputation_score = 
            reputation.correct_predictions as f64 / reputation.total_predictions as f64;
    }
    reputation.last_updated = Clock::get()?.unix_timestamp;
    
    reputation.serialize(&mut &mut reputation_account.data.borrow_mut())?;
    
    msg!("Updated reputation: {} - score: {:.2}", 
         reputation.agent_id, reputation.reputation_score);
    Ok(())
}

/// Record a prediction event
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct PredictionRecord {
    pub market_id: String,
    pub agent_id: String,
    pub prediction: String,
    pub amount: u64,
    pub timestamp: i64,
}

/// Main instruction processor
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("MoltPredict Solana Program v1.0.0");
    
    match instruction_data[0] {
        0 => {
            // Initialize reputation
            let agent_id = String::try_from_slice(&instruction_data[1..])?;
            initialize_reputation(program_id, accounts, agent_id)
        }
        1 => {
            // Update reputation
            let params = UpdateReputationParams::try_from_slice(instruction_data[1..])?;
            update_reputation(program_id, accounts, params)
        }
        _ => {
            msg!("Unknown instruction: {}", instruction_data[0]);
            Err(ProgramError::InvalidInstructionData)
        }
    }
}

// Required imports for Clock
use solana_program::clock::Clock;
