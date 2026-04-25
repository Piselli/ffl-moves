#!/usr/bin/env ruby
# frozen_string_literal: true

# Merges a Movement CLI profile "mainnet" by cloning an existing testnet profile
# and switching REST URL to Movement mainnet (official primary RPC).
# Usage: ruby scripts/movement_merge_mainnet_profile.rb [path/to/config.yaml] [source_profile]
# Default config: <repo>/.movement/config.yaml  Default source: testnet3

require "yaml"
require "fileutils"

repo_root = File.expand_path("..", __dir__)
config_path = ARGV[0] || File.join(repo_root, ".movement", "config.yaml")
source_name = (ARGV[1] || "testnet3").to_s

unless File.file?(config_path)
  warn "Файл не знайдено: #{config_path}"
  warn "Створи профіль через movement init або скопіюй config у .movement/config.yaml"
  exit 1
end

cfg = YAML.load_file(config_path)
profiles = cfg["profiles"]
unless profiles.is_a?(Hash)
  warn "Некоректний YAML: немає ключа profiles"
  exit 1
end

if profiles.key?("mainnet") && !ENV["FORCE_MAINNET_PROFILE"]
  warn "Профіль 'mainnet' уже є в #{config_path}"
  warn "Щоб перезаписати: FORCE_MAINNET_PROFILE=1 ruby scripts/movement_merge_mainnet_profile.rb"
  exit 0
end

src = profiles[source_name]
unless src.is_a?(Hash)
  warn "Немає профілю #{source_name.inspect}. Доступні: #{profiles.keys.join(', ')}"
  exit 1
end

mainnet = src.transform_keys(&:to_s)
mainnet["network"] = "Mainnet"
mainnet["rest_url"] = "https://mainnet.movementnetwork.xyz/v1"
mainnet.delete("faucet_url")

profiles["mainnet"] = mainnet

backup = "#{config_path}.bak.#{Time.now.to_i}"
FileUtils.cp(config_path, backup)
File.write(config_path, YAML.dump(cfg))

puts "OK: додано профіль mainnet (клон з #{source_name})."
puts "Резервна копія: #{backup}"
puts "Далі: movement move publish ... --profile mainnet"
