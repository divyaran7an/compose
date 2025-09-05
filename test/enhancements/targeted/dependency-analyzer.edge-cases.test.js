const { PeerDependencyAnalyzer } = require('../../../lib/dependency-analyzer');

describe('PeerDependencyAnalyzer - Targeted Coverage', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new PeerDependencyAnalyzer({
      verbose: false,
      timeout: 5000,
      retries: 2
    });
  });

  // Cover verbose logging functionality - line 1347
  describe('Verbose Mode', () => {
    it('should log in verbose mode', () => {
      const verboseAnalyzer = new PeerDependencyAnalyzer({ verbose: true });
      
      const originalConsoleLog = console.log;
      const logs = [];
      console.log = jest.fn().mockImplementation((msg) => logs.push(msg));

      verboseAnalyzer._updateProgress('Test message');
      
      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('[PeerDependencyAnalyzer] Test message');

      console.log = originalConsoleLog;
    });
  });

  // Cover fallback package creation - lines 277-279
  describe('Fallback Package Creation', () => {
    it('should create fallback package info', () => {
      const fallback = analyzer._createFallbackPackageInfo('test-pkg', '1.0.0', 'network_error');
      
      expect(fallback.name).toBe('test-pkg');
      expect(fallback.version).toBe('1.0.0');
      expect(fallback._fallback).toBe(true);
      expect(fallback._fallbackReason).toBe('network_error');
    });
  });

  // Cover malformed package handling - lines 253-255
  describe('Malformed Package Handling', () => {
    it('should handle malformed packages', () => {
      const error = new Error('Invalid package name');
      analyzer._handleMalformedPackage('invalid!name', '1.0.0', error);
      
      expect(analyzer.malformedPackages).toHaveLength(1);
      expect(analyzer.malformedPackages[0].package).toBe('invalid!name');
      expect(analyzer.malformedPackages[0].error).toBe('Invalid package name');
    });
  });

  // Cover version check edge cases - line 800
  describe('Version Compatibility', () => {
    it('should handle invalid versions in compatibility check', () => {
      expect(analyzer._checkVersionCompatibility('invalid', '^1.0.0')).toBe(false);
      expect(analyzer._checkVersionCompatibility('^1.0.0', 'invalid')).toBe(false);
    });
  });

  // Cover missing peer resolution - lines 829-832
  describe('Missing Peer Resolution', () => {
    it('should resolve missing peer dependency', () => {
      const conflict = {
        type: 'missing_peer',
        package: 'requiring-pkg',
        peerDependency: 'missing-pkg',
        requiredVersion: '^1.0.0',
        requiredBy: ['some-pkg']
      };
      
      const dependencies = {};
      const resolution = analyzer._resolveMissingPeer(conflict, dependencies);
      
      expect(resolution.action).toBe('add');
      expect(resolution.package).toBe('missing-pkg');
      expect(resolution.version).toBe('^1.0.0');
    });
  });

  // Cover version mismatch resolution - lines 883-897
  describe('Version Mismatch Resolution', () => {
    it('should resolve version mismatches', () => {
      const conflict = {
        type: 'version_mismatch',
        package: 'requiring-pkg',
        peerDependency: 'test-pkg',
        installedVersion: '^1.0.0',
        requiredVersion: '^2.0.0',
        requiredBy: ['other-pkg']
      };
      
      const dependencies = { 'test-pkg': '^1.0.0' };
      const resolution = analyzer._resolveVersionMismatch(conflict, dependencies);
      
      expect(resolution.action).toBe('update');
      expect(resolution.package).toBe('test-pkg');
      expect(resolution.toVersion).toBe('^2.0.0');
    });
  });

  // Cover version check failed resolution - lines 932-939
  describe('Version Check Failed Resolution', () => {
    it('should resolve version check failures', () => {
      const conflict = {
        type: 'version_check_failed',
        package: 'requiring-pkg',
        peerDependency: 'test-pkg',
        installedVersion: 'invalid',
        requiredVersion: '^1.0.0'
      };
      
      const dependencies = { 'test-pkg': 'invalid' };
      const resolution = analyzer._resolveVersionCheckFailed(conflict, dependencies);
      
      expect(resolution.action).toBe('warn');
      expect(resolution.package).toBe('test-pkg');
    });
  });

  // Cover recommendation generation edge cases - lines 1237-1241, 1247
  describe('Recommendation Generation', () => {
    it('should generate unresolved conflicts recommendation', () => {
      const conflicts = [
        { package: 'pkg1', id: 'c1' },
        { package: 'pkg2', id: 'c2' }
      ];
      const resolutions = [
        { originalConflict: conflicts[0] }
      ];

      const recommendations = analyzer._generateRecommendations(conflicts, resolutions);
      
      const manualReview = recommendations.find(r => r.type === 'manual_review');
      expect(manualReview).toBeDefined();
      expect(manualReview.conflicts).toEqual(['pkg2']);
    });

    it('should generate installation flags recommendation', () => {
      const conflicts = [{ package: 'pkg1' }, { package: 'pkg2' }];
      const resolutions = [{ package: 'pkg1' }];

      const recommendations = analyzer._generateRecommendations(conflicts, resolutions);
      
      const installFlags = recommendations.find(r => r.type === 'installation_flags');
      expect(installFlags).toBeDefined();
    });
  });

  // Cover edge case report generation - line 1143
  describe('Edge Case Report Generation', () => {
    it('should handle network failure grouping', () => {
      analyzer.networkErrors = [
        { package: 'pkg1', error: 'Error 1', timestamp: '2023-01-01T00:00:00.000Z' },
        { package: 'pkg1', error: 'Error 2', timestamp: '2023-01-01T00:01:00.000Z' }
      ];
      analyzer.malformedPackages = [];
      analyzer.totalPackages = 2;

      const report = analyzer._generateEdgeCaseReport(new Map());
      
      expect(report.networkFailures).toHaveLength(1);
      expect(report.networkFailures[0].attempts).toBe(2);
    });
  });

  // Cover offline package info generation - lines 1025-1043  
  describe('Offline Package Info', () => {
    it('should generate offline package info', () => {
      const packageInfo = analyzer._getOfflinePackageInfo('test-pkg', '1.0.0');
      
      expect(packageInfo.name).toBe('test-pkg');
      expect(packageInfo.version).toBe('1.0.0');
      expect(packageInfo._offline).toBe(true);
      expect(packageInfo.peerDependencies).toEqual({});
    });
  });

  // NEW: Cover _resolvePackageVersion array handling - lines 1006-1011
  describe('Package Version Resolution', () => {
    it('should handle array of versions from npm view', async () => {
      const mockExecuteCommand = jest.spyOn(analyzer, '_executeCommand');
      mockExecuteCommand.mockResolvedValue(JSON.stringify(['1.0.0', '1.1.0', '1.2.0']));

      const result = await analyzer._resolvePackageVersion('test-pkg', '^1.0.0');
      expect(result).toBe('1.2.0'); // Latest version in array

      mockExecuteCommand.mockRestore();
    });

    it('should handle single version string from npm view', async () => {
      const mockExecuteCommand = jest.spyOn(analyzer, '_executeCommand');
      mockExecuteCommand.mockResolvedValue(JSON.stringify('1.5.0'));

      const result = await analyzer._resolvePackageVersion('test-pkg', '^1.0.0');
      expect(result).toBe('1.5.0');

      mockExecuteCommand.mockRestore();
    });

    it('should fallback to coerced version on npm command failure', async () => {
      const mockExecuteCommand = jest.spyOn(analyzer, '_executeCommand');
      mockExecuteCommand.mockRejectedValue(new Error('npm command failed'));

      const result = await analyzer._resolvePackageVersion('test-pkg', '^1.0.0');
      expect(result).toBe('1.0.0'); // Coerced version

      mockExecuteCommand.mockRestore();
    });

    it('should fallback to original version range when coercion fails', async () => {
      const mockExecuteCommand = jest.spyOn(analyzer, '_executeCommand');
      mockExecuteCommand.mockRejectedValue(new Error('npm command failed'));

      const result = await analyzer._resolvePackageVersion('test-pkg', 'invalid-version');
      expect(result).toBe('invalid-version'); // Fallback to original

      mockExecuteCommand.mockRestore();
    });
  });

  // NEW: Cover edge case recommendations - lines around 1200-1217
  describe('Edge Case Recommendations', () => {
    it('should generate recommendations for fallback packages', () => {
      const packageInfoMap = new Map([
        ['fallback-pkg1', { name: 'fallback-pkg1', _fallback: true, _fallbackReason: 'network_error' }],
        ['fallback-pkg2', { name: 'fallback-pkg2', _fallback: true, _fallbackReason: 'timeout' }]
      ]);

      const report = analyzer._generateEdgeCaseReport(packageInfoMap);
      
      const fallbackRec = report.recommendations.find(r => r.type === 'fallback_packages');
      expect(fallbackRec).toBeDefined();
      expect(fallbackRec.message).toContain('2 packages used fallback data');
      expect(fallbackRec.severity).toBe('medium');
    });

    it('should generate recommendations for network failures', () => {
      analyzer.networkErrors = [
        { package: 'pkg1', error: 'ENOTFOUND', timestamp: '2023-01-01T00:00:00.000Z' },
        { package: 'pkg2', error: 'timeout', timestamp: '2023-01-01T00:01:00.000Z' }
      ];

      const report = analyzer._generateEdgeCaseReport(new Map());
      
      const networkRec = report.recommendations.find(r => r.type === 'network_issues');
      expect(networkRec).toBeDefined();
      expect(networkRec.message).toContain('2 packages experienced network failures');
      expect(networkRec.severity).toBe('high');
    });

    it('should generate recommendations for malformed packages', () => {
      analyzer.malformedPackages = [
        { package: 'invalid!', error: 'Invalid name' },
        { package: '', error: 'Empty name' }
      ];

      const report = analyzer._generateEdgeCaseReport(new Map());
      
      const malformedRec = report.recommendations.find(r => r.type === 'malformed_packages');
      expect(malformedRec).toBeDefined();
      expect(malformedRec.message).toContain('2 packages have invalid names');
      expect(malformedRec.severity).toBe('high');
    });

    it('should generate offline mode recommendations', () => {
      const offlineAnalyzer = new PeerDependencyAnalyzer({ offline: true });
      const packageInfoMap = new Map([
        ['offline-pkg1', { name: 'offline-pkg1', _offline: true }],
        ['offline-pkg2', { name: 'offline-pkg2', _offline: true }]
      ]);

      const report = offlineAnalyzer._generateEdgeCaseReport(packageInfoMap);
      
      const offlineRec = report.recommendations.find(r => r.type === 'offline_mode');
      expect(offlineRec).toBeDefined();
      expect(offlineRec.message).toContain('Analysis ran in offline mode with 2 packages');
    });
  });

  // NEW: Cover _findCompatibleVersion null return - line 968-969
  describe('Find Compatible Version Edge Cases', () => {
    it('should return null for incompatible version ranges', () => {
      const result = analyzer._findCompatibleVersion('invalid-version', '^1.0.0');
      expect(result).toBeNull();
    });

    it('should return current version when it satisfies required range', () => {
      const result = analyzer._findCompatibleVersion('^1.5.0', '^1.0.0');
      expect(result).toBe('^1.5.0');
    });

    it('should return required version when current doesnt satisfy', () => {
      const result = analyzer._findCompatibleVersion('^1.0.0', '^2.0.0');
      expect(result).toBe('^2.0.0');
    });
  });

  // NEW: Cover cache hit rate calculation edge case - line 1143
  describe('Cache Utilization Edge Cases', () => {
    it('should handle zero totalPackages in cache hit rate calculation', () => {
      analyzer.totalPackages = 0;
      analyzer.packageInfoCache.set('test', {});
      
      const report = analyzer._generateEdgeCaseReport(new Map());
      
      expect(report.cacheUtilization.cacheHitRate).toBe('0%');
    });

    it('should calculate cache hit rate correctly with packages', () => {
      analyzer.totalPackages = 10;
      analyzer.packageInfoCache.set('test1', {});
      analyzer.packageInfoCache.set('test2', {});
      
      const report = analyzer._generateEdgeCaseReport(new Map());
      
      expect(report.cacheUtilization.cacheHitRate).toBe('20.00%');
    });
  });

  // NEW: Cover performance success rate calculation edge case 
  describe('Performance Metrics Edge Cases', () => {
    it('should handle zero totalPackages in success rate calculation', () => {
      analyzer.totalPackages = 0;
      analyzer.processedPackages = 0;
      analyzer.failedPackages = 0;
      
      const result = analyzer._generateAnalysisResult({}, [], [], new Map());
      
      expect(result.metadata.performance.successRate).toBe('100%');
    });

    it('should calculate success rate correctly', () => {
      analyzer.totalPackages = 10;
      analyzer.processedPackages = 8;
      analyzer.failedPackages = 2;
      
      const result = analyzer._generateAnalysisResult({}, [], [], new Map());
      
      expect(result.metadata.performance.successRate).toBe('60.00%');
    });
  });

  // NEW: Cover error handling in main analysis method
  describe('Analysis Error Handling', () => {
    it('should handle errors during analysis and save cache', async () => {
      const analyzerWithCache = new PeerDependencyAnalyzer({
        enableOfflineCache: true,
        timeout: 1000,
        retries: 1
      });

      // Mock methods to trigger an error during analysis
      const mockFetchAll = jest.spyOn(analyzerWithCache, '_fetchAllPackageInfo');
      mockFetchAll.mockRejectedValue(new Error('Fetch failed'));

      const mockSaveCache = jest.spyOn(analyzerWithCache, '_saveOfflineCache');
      mockSaveCache.mockResolvedValue();

      const dependencies = { 'test-pkg': '^1.0.0' };

      await expect(analyzerWithCache.analyzePeerDependencies(dependencies))
        .rejects.toThrow('Peer dependency analysis failed: Fetch failed');

      expect(analyzerWithCache.errors).toHaveLength(1);
      expect(analyzerWithCache.errors[0].type).toBe('analysis_error');
      expect(mockSaveCache).toHaveBeenCalled(); // Cache should be saved even on error

      mockFetchAll.mockRestore();
      mockSaveCache.mockRestore();
    });
  });

  // NEW: Cover packages with peer dependencies filtering
  describe('Packages With Peer Dependencies Filtering', () => {
    it('should count packages with peer dependencies correctly', () => {
      const packageInfoMap = new Map([
        ['pkg-with-peers', { name: 'pkg-with-peers', peerDependencies: { 'react': '^18.0.0' } }],
        ['pkg-without-peers', { name: 'pkg-without-peers', peerDependencies: {} }],
        ['pkg-null-peers', { name: 'pkg-null-peers' }] // Missing peerDependencies property
      ]);

      const result = analyzer._generateAnalysisResult({}, [], [], packageInfoMap);
      
      expect(result.summary.packagesWithPeerDeps).toBe(1);
    });
  });

  // NEW: Cover _applyResolutions method
  describe('Apply Resolutions', () => {
    it('should apply add and update resolutions correctly', () => {
      const dependencies = {
        'existing-pkg': '^1.0.0'
      };

      const resolutions = [
        { action: 'add', package: 'new-pkg', version: '^2.0.0' },
        { action: 'update', package: 'existing-pkg', toVersion: '^1.5.0' },
        { action: 'warn', package: 'warning-pkg', message: 'Warning only' }
      ];

      const result = analyzer._applyResolutions(dependencies, resolutions);
      
      expect(result['new-pkg']).toBe('^2.0.0');
      expect(result['existing-pkg']).toBe('^1.5.0');
      expect(result['warning-pkg']).toBeUndefined(); // warn action doesn't modify
    });
  });

  // NEW: Cover high priority conflicts recommendation
  describe('High Priority Conflicts', () => {
    it('should generate high priority recommendations', () => {
      const conflicts = [
        { package: 'critical-pkg', severity: 'high' },
        { package: 'normal-pkg', severity: 'medium' }
      ];
      const resolutions = [];

      const recommendations = analyzer._generateRecommendations(conflicts, resolutions);
      
      const highPriority = recommendations.find(r => r.type === 'high_priority');
      expect(highPriority).toBeDefined();
      expect(highPriority.message).toContain('1 high-severity peer dependency conflicts');
      expect(highPriority.conflicts).toEqual(['critical-pkg']);
    });
  });

  // NEW: Cover invalid package info handling
  describe('Invalid Package Info', () => {
    it('should handle packages with fetch errors in edge case report', () => {
      const packageInfoMap = new Map([
        ['error-pkg', { name: 'error-pkg', _fetchError: 'Package not found', version: '1.0.0' }]
      ]);

      const report = analyzer._generateEdgeCaseReport(packageInfoMap);
      
      expect(report.invalidPackages).toHaveLength(1);
      expect(report.invalidPackages[0].package).toBe('error-pkg');
      expect(report.invalidPackages[0].error).toBe('Package not found');
    });
  });
});
