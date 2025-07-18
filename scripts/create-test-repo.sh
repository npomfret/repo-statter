#!/bin/bash

# Script to create a test repository with diverse commits for testing repo-statter
# This creates a realistic test scenario with multiple file types, users, and operations

set -e

# Parse command line arguments
REUSE_FLAG=false
PERSISTENT_REPO_PATH="${TMPDIR:-/tmp}/repo-statter-test-repo-persistent"

while [[ $# -gt 0 ]]; do
    case $1 in
        --reuse)
            REUSE_FLAG=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--reuse]"
            exit 1
            ;;
    esac
done

# Check if we should reuse existing repo
if [ "$REUSE_FLAG" = true ] && [ -d "$PERSISTENT_REPO_PATH/.git" ]; then
    REPO_DIR="$PERSISTENT_REPO_PATH"
    echo "ℹ️  Using existing test repository at: $REPO_DIR"
    echo "TEST_REPO_PATH=$REPO_DIR"
    exit 0
fi

# Create new repo (either first time or when not reusing)
if [ "$REUSE_FLAG" = true ]; then
    # Create at persistent location
    REPO_DIR="$PERSISTENT_REPO_PATH"
    rm -rf "$REPO_DIR"
    mkdir -p "$REPO_DIR"
else
    # Create at temporary location
    REPO_DIR=$(mktemp -d "${TMPDIR:-/tmp}/repo-statter-test-repo.XXXXXX")
fi

# Initialize the repo
cd "$REPO_DIR"
git init

# Configure different users for commits
declare -a USERS=(
    "Alice Johnson:alice@example.com"
    "Bob Smith:bob@example.com" 
    "Carol Davis:carol@example.com"
)

# Function to set git user
set_user() {
    local user_info=$1
    local name=$(echo "$user_info" | cut -d: -f1)
    local email=$(echo "$user_info" | cut -d: -f2)
    git config user.name "$name"
    git config user.email "$email"
}

# Function to generate simple file content
generate_file_content() {
    local lines=$1
    local extension=$2
    local base_name=$3
    
    for i in $(seq 1 $lines); do
        case $extension in
            js)
                echo "// Line $i in $base_name.$extension - $(date +%s%N | cut -b1-13)"
                ;;
            ts)
                echo "// TypeScript line $i in $base_name.$extension - $(date +%s%N | cut -b1-13)"
                ;;
            json)
                if [ $i -eq 1 ]; then echo "{"
                elif [ $i -eq $lines ]; then echo "}"
                else echo "  \"key$i\": \"value$i\","
                fi
                ;;
            md)
                if [ $i -eq 1 ]; then echo "# $base_name"
                else echo "Content line $i for $base_name documentation"
                fi
                ;;
            gitignore)
                echo "*.log"
                echo "node_modules/"
                echo "dist/"
                echo ".env"
                echo ".DS_Store"
                echo "coverage/"
                break
                ;;
            *)
                echo "Line $i content for $base_name.$extension with data $(date +%s%N | cut -b1-13)"
                ;;
        esac
    done
}

# Function to create a commit with a specific user
commit_as() {
    local user_index=$1
    local message=$2
    set_user "${USERS[$user_index]}"
    git add .
    git commit -m "$message"
    sleep 1  # Ensure different timestamps
}

echo "Creating test repository with diverse commits..."

# Commit 1: Alice creates initial JavaScript files
set_user "${USERS[0]}"
generate_file_content 8 js utils > utils.js
generate_file_content 12 js app > app.js

commit_as 0 "Initial commit: Add basic JavaScript application structure"

# Commit 2: Bob adds TypeScript configuration and files
set_user "${USERS[1]}"
generate_file_content 12 json tsconfig > tsconfig.json

mkdir -p src
generate_file_content 15 ts types > src/types.ts
generate_file_content 25 ts api > src/api.ts

commit_as 1 "Add TypeScript configuration and API client"

# Commit 3: Carol adds package.json and more JS utilities
set_user "${USERS[2]}"
generate_file_content 15 json package > package.json
generate_file_content 20 js helpers > helpers.js

commit_as 2 "Add package.json and helper utilities"

# Commit 4: Alice refactors and adds more TypeScript
set_user "${USERS[0]}"
generate_file_content 30 ts logger > src/logger.ts

# Update utils.js with additional functions
generate_file_content 5 js utils_extra >> utils.js

commit_as 0 "Add logging system and extend utilities"

# Commit 5: Bob adds database layer
set_user "${USERS[1]}"
generate_file_content 35 ts database > src/database.ts

commit_as 1 "Add database layer and user repository"

# Commit 6: Carol adds validation and error handling
set_user "${USERS[2]}"
generate_file_content 25 js validation > validation.js

commit_as 2 "Add input validation and error handling"

# Commit 7: Alice deletes old file and refactors
set_user "${USERS[0]}"
rm helpers.js  # Delete the helpers file
git add .

# Update app.js to use new validation
generate_file_content 18 js app > app.js

commit_as 0 "Remove helpers.js and refactor app to use validation"

# Commit 8: Bob adds more TypeScript features
set_user "${USERS[1]}"
generate_file_content 28 ts events > src/events.ts

commit_as 1 "Add event system with TypeScript generics"

# Commit 9: Carol adds configuration management
set_user "${USERS[2]}"
generate_file_content 30 js config > config.js

commit_as 2 "Add configuration management system"

# Commit 10: Carol does major cleanup - removes old code
set_user "${USERS[2]}"
# Remove validation.js entirely
rm validation.js
# Heavily reduce utils.js
generate_file_content 3 js utils > utils.js
# Also cleanup app.js
generate_file_content 8 js app > app.js

commit_as 2 "Major cleanup: Remove validation system and simplify utils"

# Commit 11: Alice adds final TypeScript service layer
set_user "${USERS[0]}"
generate_file_content 32 ts services > src/services.ts

commit_as 0 "Add service layer with event integration"

# Commit 12: Bob adds a README
set_user "${USERS[1]}"
generate_file_content 18 md README > README.md

commit_as 1 "Add README documentation"

# Final commit: Carol updates package.json and adds .gitignore
set_user "${USERS[2]}"
# Update package.json with more realistic content
generate_file_content 18 json package > package.json

# Add .gitignore
generate_file_content 6 gitignore gitignore > .gitignore

commit_as 2 "Update package.json and add .gitignore"

cd ..

echo "✅ Test repository created successfully!"

# Count the actual commits
COMMIT_COUNT=$(git -C "$REPO_DIR" log --oneline | wc -l | tr -d ' ')
echo "📊 Repository stats:"
echo "   - $COMMIT_COUNT commits"
echo "   - 3 contributors (Alice, Bob, Carol)"
echo "   - Mixed JavaScript and TypeScript files"
echo "   - File operations: create, edit, delete"
echo "   - Various file types: .js, .ts, .json, .md"
echo ""
echo "🚀 You can now run: npm start \"$REPO_DIR\""
echo "TEST_REPO_PATH=$REPO_DIR"