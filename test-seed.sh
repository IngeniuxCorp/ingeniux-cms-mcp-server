#!/bin/sh
# Seed and cleanup test data for local Ingeniux CMS MCP Server

ACTION=$1

if [ "$ACTION" = "seed" ]; then
	echo "Seeding test data (mock only)..."
	# Add mock data seeding logic here if needed
	exit 0
elif [ "$ACTION" = "cleanup" ]; then
	echo "Cleaning up test data (mock only)..."
	# Add mock data cleanup logic here if needed
	exit 0
else
	echo "Usage: $0 [seed|cleanup]"
	exit 1
fi